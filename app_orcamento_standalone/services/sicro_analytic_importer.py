import pandas as pd
import sys
import os
import re
from uuid import uuid4
from decimal import Decimal

# Add parent to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from models import ReferenceItem, SicroCompositionTeam, SicroProductionRate, ReferenceSource, CompositionItem
import logging

async def import_sicro_analytic(file_path: str, state: str, db: AsyncSession):
    print(f"Deep Parsing SICRO Analytic: {file_path}")
    
    # Cleanup existing details to allow re-run
    print("Cleaning up old details...")
    try:
        await db.execute(text("TRUNCATE TABLE sicro_teams CASCADE")) 
    except:
        await db.execute(text("DELETE FROM sicro_teams"))
    await db.execute(text("DELETE FROM sicro_production_rates"))
    await db.execute(text("DELETE FROM composition_items"))
    await db.commit()
    
    # Load entire sheet
    df = pd.read_excel(file_path, header=None)
    
    current_source_id = 1
    res = await db.execute(select(ReferenceSource).where(ReferenceSource.name == "SICRO"))
    src = res.scalars().first()
    if src: current_source_id = src.id

    # Cache Item IDs (Code -> ID)
    print("Caching items...")
    item_cache = {}
    q = await db.execute(select(ReferenceItem.code, ReferenceItem.id).where(ReferenceItem.source_id == current_source_id))
    for row in q.all():
        normalized_key = str(row.code).strip().lstrip('0')
        item_cache[normalized_key] = row.id
        
    print(f"Cached {len(item_cache)} items (Normalized keys).")
    
    parsing_state = "SEARCH_COMP"
    comp_count = 0
    current_comp_id = None
    current_comp_members = set()
    processed_comps = set()
    comps_with_materials = set()

    for i, row in df.iterrows():
        # Helpers
        def get_col(idx):
            if idx < len(row):
                val = row[idx]
                if pd.notna(val): return str(val).strip()
            return ""

        val0 = get_col(0)
        val1 = get_col(1)
        row_str = " ".join([str(x) for x in row if pd.notna(x)])

        # 1. Detect Composition Header
        # Code (7 digits) in col 0 + Desc in col 1
        norm_val0 = val0.lstrip('0')
        
        if re.match(r'^\d{7}$', val0) and len(val1) > 5 and parsing_state != "METADATA":
            if norm_val0 in item_cache:
                current_comp_id = item_cache[norm_val0]
                current_comp_members = set() # Reset for new comp
                
                # Pre-emptive Cleanup for this comp (in case file repeats it)
                # This prevents PK violation if comp appears twice in file
                # Don't await query inside loop if possible? 
                # We can bundle? No, duplicate might be far apart.
                # Just add to session?
                # SQLAlchemy doesn't support "delete" add easily?
                # We execute delete.
                try:
                    stmt = text(f"DELETE FROM sicro_teams WHERE composition_item_id = '{current_comp_id}'")
                    await db.execute(stmt)
                    stmt2 = text(f"DELETE FROM composition_items WHERE parent_item_id = '{current_comp_id}'")
                    await db.execute(stmt2)
                     # Production rates too?
                    stmt3 = text(f"DELETE FROM sicro_production_rates WHERE item_id = '{current_comp_id}'")
                    await db.execute(stmt3)
                except: pass
                
                parsing_state = "METADATA"
                comp_count += 1
                processed_comps.add(current_comp_id)
                if comp_count % 100 == 0: 
                    print(f"Parsed {comp_count} compositions...")
            else:
                current_comp_id = None
            continue

        if not current_comp_id: continue
        
        # 2. Metadata (Production)
        if parsing_state == "METADATA":
            if "odução da equip" in row_str.lower(): # Simpler check
                try:
                    # HEURISTIC: Find first float after "Produção" in cols 6,7,8
                    p_text = get_col(7)
                    if not p_text: p_text = get_col(6)
                    if not p_text: p_text = get_col(8)
                    
                    prod_val = float(p_text.replace(',','.'))
                    unit_text = get_col(8) if p_text == get_col(7) else get_col(7) # Guess unit location
                    
                    rate = SicroProductionRate(
                        item_id=current_comp_id,
                        production_hourly=Decimal(prod_val),
                        unit=unit_text if unit_text else "UN",
                        scenario="DEFAULT"
                    )
                    db.add(rate)
                except: pass
        
        # 3. Detect Sections
        if " - EQUIPAMENTOS" in row_str:
            parsing_state = "EQUIPMENT"
            continue
        if " - MÃO DE OBRA" in row_str:
            parsing_state = "LABOR"
            continue
        if " - MATERIAL" in row_str:
            parsing_state = "MATERIAL"
            continue
        if "CUSTO TOTAL" in row_str:
             parsing_state = "SEARCH_COMP"
             continue
             
        # 4. Parse Items
        if parsing_state in ["EQUIPMENT", "LABOR", "MATERIAL"]:
            candidate_code = get_col(0)
            if not candidate_code: continue
            
            norm_candidate = candidate_code.lstrip('0')
            child_id = None
            
            if norm_candidate in item_cache:
                child_id = item_cache[norm_candidate]
            else:
                # Create Item on Fly
                desc = get_col(1)
                unit = get_col(3)
                if not desc: continue
                
                child_id = uuid4()
                itype = "INPUT"
                if parsing_state == "EQUIPMENT": itype = "EQUIPMENT"
                elif parsing_state == "LABOR": itype = "LABOR"
                elif parsing_state == "MATERIAL": itype = "MATERIAL"
                
                new_item = ReferenceItem(
                    id=child_id,
                    source_id=current_source_id,
                    code=candidate_code,
                    description=desc,
                    unit=unit if unit else "UN",
                    type=itype
                )
                try:
                    db.add(new_item)
                    item_cache[norm_candidate] = child_id
                except:
                    # If duplicate key, we skip usage
                    child_id = None
                
            if not child_id: continue
            
            # Now Link
            try:
                qty_text = get_col(2)
                if not qty_text: continue
                qty_val = float(str(qty_text).replace(',','.'))
                
                if parsing_state in ["EQUIPMENT", "LABOR"]:
                    # Check duplication in this comp
                    if (current_comp_id, child_id) in current_comp_members:
                       continue

                    team_link = SicroCompositionTeam(
                        composition_item_id=current_comp_id,
                        member_item_id=child_id,
                        quantity=Decimal(qty_val)
                    )
                    db.add(team_link)
                    current_comp_members.add((current_comp_id, child_id))
                else:
                    # Material
                    if (current_comp_id, child_id) in current_comp_members:
                       continue
                       
                    mat_link = CompositionItem(
                        parent_item_id=current_comp_id,
                        child_item_id=child_id,
                        coefficient=Decimal(qty_val)
                    )
                    db.add(mat_link)
                    current_comp_members.add((current_comp_id, child_id))
                    comps_with_materials.add(current_comp_id)
            except: pass

    try:
        # Validar: todas as composições processadas precisam ter pelo menos um material
        missing = [cid for cid in processed_comps if cid not in comps_with_materials]
        if missing:
            await db.rollback()
            raise RuntimeError(f"Importação incompleta: {len(missing)} composições sem insumos (composition_items)")

        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"Final Commit Error: {e}")
        raise
    
    print(f"Deep Parsing Done. Processed {comp_count} compositions.")

if __name__ == "__main__":
    import asyncio
    from database import AsyncSessionLocal
    async def main():
        async with AsyncSessionLocal() as db:
            f = "storage/temp_sicro_analysis/RS 07-2025 Relatório Analítico de Composições de Custos.xlsx"
            if len(sys.argv) > 1: f = sys.argv[1]
            await import_sicro_analytic(f, "RS", db)
            
    asyncio.run(main())
