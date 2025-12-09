import pandas as pd
import io
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ReferenceItem, ReferencePrice, SicroCompositionTeam, ReferenceSource
from uuid import uuid4
from datetime import date
from decimal import Decimal

async def import_sicro_excel(file_path: str, state: str, month: int, year: int, db: AsyncSession):
    print(f"Importing SICRO from {file_path} for {state}/{month}/{year}...")
    
    # 1. Load Data
    # The Analytic file is usually heavy.
    df = pd.read_excel(file_path, header=None) # Read no header to find it dynamically
    
    # Find header row (usually contains 'Código' and 'Descrição')
    header_idx = -1
    for i in range(20):
        row = df.iloc[i].astype(str).tolist()
        if any("CÓDIGO" in c.upper() for c in row) and any("DESCRIÇÃO" in c.upper() for c in row):
            header_idx = i
            break
            
    if header_idx == -1:
        raise ValueError("Could not find header row in SICRO file.")
        
    # Re-read with header
    df = pd.read_excel(file_path, header=header_idx)
    
    # Normalize Columns
    df.columns = [str(c).upper().strip().replace('\n', ' ') for c in df.columns]
    print("Columns found:", df.columns.tolist())
    
    # Identify Key Columns
    col_code = next((c for c in df.columns if "CÓDIGO" in c), None)
    col_desc = next((c for c in df.columns if "DESCRIÇÃO" in c), None)
    col_unit = next((c for c in df.columns if "UNIDADE" in c), None)
    col_price = next((c for c in df.columns if "CUSTO UNIT" in c or "VALOR UNIT" in c), None)
    col_qty = next((c for c in df.columns if "QUANTIDADE" in c), None)
    # SICRO distinct cols
    col_level = next((c for c in df.columns if "NÍVEL" in c or "ITEM" in c), None) 
    
    # Get SICRO Source ID
    res = await db.execute(select(ReferenceSource).where(ReferenceSource.name == "SICRO"))
    source = res.scalars().first()
    if not source:
        source = ReferenceSource(id=2, name="SICRO", description="Sistema de Custos Referenciais de Obras")
        db.add(source)
        await db.flush()
    source_id = source.id
    
    # Cache
    item_cache = {} # Code -> methods
    
    # State tracking for parsing
    current_comp_id = None
    
    count_items = 0
    
    # Iterate
    for index, row in df.iterrows():
        code = str(row[col_code]).strip()
        desc = str(row[col_desc]).strip()
        
        if pd.isna(code) or code == 'nan': continue
        
        # Is it a Header (Composition)?
        # SICRO format: 
        # Line 1: Code | Desc (Bold) -> matches our header logic?
        # Often headers have empty 'Unit' or 'Price' in analytic, OR they have everything.
        # Analytic usually lists Composition, then Indent, then Items.
        
        # Check if it's a Section Header (Equipments, Labor) -> usually no code, just Desc
        if "EQUIPAMENTOS" in desc or "MÃO DE OBRA" in desc or "MATERIAIS" in desc:
            continue
            
        # Check if valid item
        # Clean price
        try:
             price_val = float(row[col_price]) if pd.notna(row[col_price]) else 0.0
        except: price_val = 0.0

        # Create/Find Item
        if code not in item_cache:
            # Check DB
            q = await db.execute(select(ReferenceItem).where(ReferenceItem.source_id == source_id, ReferenceItem.code == code))
            item = q.scalars().first()
            if not item:
                item = ReferenceItem(
                    id=uuid4(),
                    source_id=source_id,
                    code=code,
                    description=desc,
                    unit=str(row[col_unit]) if pd.notna(row[col_unit]) else "UN",
                    type="COMPOSITION" # Default, maybe refine?
                )
                db.add(item)
                await db.flush() # Need ID
            item_cache[code] = item.id
        
        item_id = item_cache[code]
        
        # Is this a Root Item (Composition Definition) or an Ingredient?
        # In Analytic:
        # 12345 | Comp Name... -> This is the comp. defined.
        #       | 5678 | Ingredient... -> This is ingredient.
        
        # Implementation Detail:
        # SICRO Analytic repeats the Composition Code on every line? 
        # OR format is heirarchical?
        # Looking at previous step output: "307731 Aparelho...". It seems strict list.
        # Wait, step 1676 showed `[temp_sicro_analysis]` file list.
        # `RS 07-2025 Relatório Analítico de Composições de Custos.xlsx`
        # 
        # I need to know if the Excel is flat or hierarchical.
        # Assuming Hierarchical based on file name "Analítico". 
        
        # For MVP: treat ALL items as ReferenceItems and save their PRICES.
        # Linking compositions (creating SicroCompositionTeam) requires knowing PARENT-CHILD relationship.
        # If I can't determine Parent, I can at least save prices.
        
        # Create Price
        new_price = ReferencePrice(
            item_id=item_id,
            region=state,
            price=Decimal(price_val),
            date_validity=date(year, month, 1)
        )
        db.add(new_price)
        count_items += 1
        
        if count_items % 1000 == 0:
            await db.commit()
            print(f"Imported {count_items} items...")

    await db.commit()
    print(f"SICRO Import Complete. {count_items} items/prices added.")

if __name__ == "__main__":
    # Test Run
    import asyncio
    from database import AsyncSessionLocal
    
    async def main():
        async with AsyncSessionLocal() as db:
            # target file form previous step (SYNTHETIC)
            f = "storage/temp_sicro_analysis/RS 07-2025 Relatório Sintético de Composições de Custos.xlsx"
            if len(sys.argv) > 1: f = sys.argv[1]
            await import_sicro_excel(f, "RS", 7, 2025, db)

    import sys
    asyncio.run(main())
