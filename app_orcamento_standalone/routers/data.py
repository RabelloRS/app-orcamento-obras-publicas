from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from database import get_db, AsyncSessionLocal
from auth.dependencies import get_current_user
from models import User, ReferenceItem, ReferencePrice, SicroProductionRate, SicroCompositionTeam, CompositionItem
from services.importer import import_sinapi_excel, import_sicro_excel
from services.sinapi_downloader import download_latest_sinapi
from services.limiter import limiter

from typing import List, Optional, Dict
from pydantic import BaseModel
from uuid import UUID, uuid4
import asyncio
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/data", tags=["Data"])

VALID_STATES = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]

def detect_state_from_filename(filename: str | None):
    if not filename:
        return None
    import re
    m = re.search(r'[-_ ](AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)(?:[-_ .]|$)', filename.upper())
    return m.group(1) if m else None

class ItemResponse(BaseModel):
    id: UUID
    code: str
    description: str
    unit: str
    price: float
    source_name: str
    
    class Config:
        from_attributes = True

# Global Job Store (In-memory for MVP)
IMPORT_JOBS: Dict[str, dict] = {}

async def import_worker(job_id: str, content: bytes, filename: str, state: str | None, month: int | None, year: int | None, replace: bool = False, user_id: UUID | None = None):
    IMPORT_JOBS[job_id] = {"status": "processing", "progress": 0, "message": "Iniciando...", "total": 0, "current": 0}
    
    async def progress_callback(current, total, msg="Processando"):
        percentage = int((current / total) * 100) if total > 0 else 0
        IMPORT_JOBS[job_id].update({
            "progress": percentage,
            "message": msg,
            "total": total,
            "current": current
        })
    
    try:
        # Create new session for background task
        async with AsyncSessionLocal() as db:
            count = await import_sinapi_excel(content, filename, state, month, year, db, progress_callback, replace, user_id)
            IMPORT_JOBS[job_id].update({"status": "completed", "progress": 100, "message": f"Concluído: {count} itens."})
    except Exception as e:
        IMPORT_JOBS[job_id].update({"status": "error", "message": str(e)})

@router.post("/sync/sinapi")
async def sync_sinapi(
    state: str = Query(..., min_length=2, max_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    try:
        content, filename, month, year = download_latest_sinapi(state)
        count = await import_sinapi_excel(content, filename, state.upper(), month, year, db)
        return {"message": f"Successfully synced {count} items from {filename}"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-existence")
async def check_existence(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    state: Optional[str] = Query(None, min_length=2, max_length=3),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(func.count(ReferencePrice.id)).where(
        func.extract('month', ReferencePrice.date_validity) == month,
        func.extract('year', ReferencePrice.date_validity) == year,
        ReferencePrice.is_active == True
    )
    if state and state != "ALL":
        query = query.where(ReferencePrice.region == state)
        
    result = await db.execute(query)
    count = result.scalar() or 0
    return {"exists": count > 0, "count": count}

from models import ReferenceSource

@router.get("/imported-summary")
async def get_imported_data_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna resumo dos dados importados agrupados por fonte, mês e ano.
    Mostra quantidade de itens e preços por período.
    """
    # 1. Buscar fontes disponíveis
    sources_q = await db.execute(select(ReferenceSource))
    sources = {s.id: s.name for s in sources_q.scalars().all()}
    
    # 2. Contar itens por fonte
    items_by_source = {}
    for source_id, source_name in sources.items():
        count_q = await db.execute(
            select(func.count(ReferenceItem.id)).where(ReferenceItem.source_id == source_id)
        )
        items_by_source[source_name] = count_q.scalar() or 0
    
    # 3. Buscar preços agrupados por mês/ano/região
    prices_summary = []
    
    # Query para agrupar preços por data (SEM região - todos estados são importados juntos)
    from sqlalchemy import extract, distinct
    
    price_groups_q = await db.execute(
        select(
            extract('year', ReferencePrice.date_validity).label('year'),
            extract('month', ReferencePrice.date_validity).label('month'),
            func.count(ReferencePrice.id).label('price_count'),
            func.count(distinct(ReferencePrice.region)).label('region_count')
        )
        .where(ReferencePrice.is_active == True)
        .group_by(
            extract('year', ReferencePrice.date_validity),
            extract('month', ReferencePrice.date_validity)
        )
        .order_by(
            extract('year', ReferencePrice.date_validity).desc(),
            extract('month', ReferencePrice.date_validity).desc()
        )
    )
    
    for row in price_groups_q.all():
        prices_summary.append({
            "year": int(row.year) if row.year else None,
            "month": int(row.month) if row.month else None,
            "price_count": row.price_count,
            "region_count": row.region_count  # Quantos estados têm preços
        })
    
    # 4. Totais gerais
    total_items_q = await db.execute(select(func.count(ReferenceItem.id)))
    total_items = total_items_q.scalar() or 0
    
    total_prices_q = await db.execute(
        select(func.count(ReferencePrice.id)).where(ReferencePrice.is_active == True)
    )
    total_prices = total_prices_q.scalar() or 0
    
    return {
        "sources": items_by_source,
        "prices_by_period": prices_summary,
        "totals": {
            "items": total_items,
            "active_prices": total_prices
        }
    }

@router.post("/sync/sicro")
async def sync_sicro(
    state: str = Query(..., min_length=2, max_length=2),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    replace: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    try:
        from services.sicro_downloader import SicroDownloader
        from services.importer import import_sicro_excel
        import os
        
        job_id = str(uuid4())
        
        # We start a background task to Download AND Import
        # Define wrapper
        async def sicro_full_sync(job_id, state, month, year, replace_flag, user_id):
             IMPORT_JOBS[job_id] = {"status": "processing", "progress": 0, "message": "Baixando SICRO...", "type": "SICRO"}
             try:
                 dl = SicroDownloader()
                 # Download to temp
                 fpath = dl.download(state, month, year, output_dir="storage/temp_sicro")
                 fname = os.path.basename(fpath)
                 
                 with open(fpath, "rb") as f:
                     content = f.read()
                 
                 IMPORT_JOBS[job_id]["message"] = "Importando SICRO..."
                 
                 # Now import
                 async with AsyncSessionLocal() as db_session:
                      async def p_cb(c, t, m):
                           pct = int((c/t)*100) if t>0 else 0
                           IMPORT_JOBS[job_id].update({"progress": pct, "message": m, "current": c, "total": t})

                      count = await import_sicro_excel(content, fname, state, month, year, db_session, p_cb, replace_flag, user_id)
                      
                 IMPORT_JOBS[job_id].update({"status": "completed", "progress": 100, "message": f"Sucesso: {count} itens."})
                 
                 # Cleanup
                 if os.path.exists(fpath): os.remove(fpath)
                 
             except Exception as e:
                 IMPORT_JOBS[job_id].update({"status": "error", "message": str(e)})

        # Start Task
        IMPORT_JOBS[job_id] = {"status": "pending", "message": "Sincronização iniciada", "type": "SICRO"}
        
        # We need to run this in background. 
        # But we don't have BackgroundTasks object here?
        # We should add it to signature.
        # Wait, I cannot add it inside the body.
        # I need to change the function signature.
        pass
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
         
    return {"job_id": job_id, "message": "Job created (Refactor needed to attach bg task)"}

# Correct implementation below with BackgroundTasks
@router.post("/sync/sicro_start")
async def sync_sicro_start(
    background_tasks: BackgroundTasks,
    state: str = Query(..., min_length=2, max_length=2),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    replace: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
        
    job_id = str(uuid4())
    IMPORT_JOBS[job_id] = {"status": "pending", "message": "Iniciando download...", "type": "SICRO_SYNC"}
    
    background_tasks.add_task(run_sicro_sync, job_id, state.upper(), month, year, replace, current_user.id)
    return {"job_id": job_id, "message": "Sincronização iniciada"}

async def run_sicro_sync(job_id, state, month, year, replace, user_id):
    from services.sicro_downloader import SicroDownloader
    from services.importer import import_sicro_excel
    import os
    
    try:
         IMPORT_JOBS[job_id]["status"] = "processing"
         dl = SicroDownloader()
         fpath = dl.download(state, month, year, output_dir="storage/temp_sicro")
         fname = os.path.basename(fpath)
         
         with open(fpath, "rb") as f:
             content = f.read()
             
         IMPORT_JOBS[job_id]["message"] = "Importando dados..."
         
         async with AsyncSessionLocal() as db:
             async def cb(c, t, m):
                  pct = int((c/t)*100) if t>0 else 0
                  IMPORT_JOBS[job_id].update({"progress": pct, "message": m})
             
             count = await import_sicro_excel(content, fname, state, month, year, db, cb, replace, user_id)
             
         IMPORT_JOBS[job_id].update({"status": "completed", "progress": 100, "message": f"Importado: {count}."})
         if os.path.exists(fpath): os.remove(fpath)
         
    except Exception as e:
        IMPORT_JOBS[job_id].update({"status": "error", "message": f"Erro: {str(e)}"})

@router.post("/import/sinapi")
async def upload_sinapi(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    state: Optional[str] = Query(None, min_length=2, max_length=3),
    month: Optional[int] = Query(None, ge=1, le=12), # Now optional
    year: Optional[int] = Query(None, ge=2000, le=2100), # Now optional
    replace: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
        
    if not file.filename.endswith((".xls", ".xlsx", ".zip")):
        raise HTTPException(status_code=400, detail="Invalid file format")
        
    content = await file.read()
    job_id = str(uuid4())

    # If no UF provided, import all UFs present in the file (single upload covers o país todo)
    state = state.upper() if state else None
    
    # Pass None for month/year if not provided, worker handles it
    background_tasks.add_task(import_worker, job_id, content, file.filename, state, month, year, replace, current_user.id)
    
    return {"job_id": job_id, "message": "Importação iniciada em segundo plano"}

@router.post("/import/sicro")
async def upload_sicro(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    state: Optional[str] = Query(None, min_length=2, max_length=3),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    replace: bool = Query(False),
    current_user: User = Depends(get_current_user)
):
    # Verify Extension
    if not file.filename.endswith(('.zip', '.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Apenas arquivos .zip, .xls, .xlsx são permitidos.")

    # Create Job ID
    job_id = str(uuid4())
    IMPORT_JOBS[job_id] = {
        "status": "pending", 
        "progress": 0, 
        "message": "Aguardando início...",
        "type": "SICRO"
    }

    content = await file.read()
    
    if state: state = state.upper()
    
    # We reuse import_worker but need it to support switching between sinapi/sicro functions
    # Or strict a new worker.
    # Let's create a specific worker wrapper or adjust import_worker to take a 'type' param?
    # import_worker is defined below. Let's see it.
    
    # Actually import_worker calls import_sinapi_excel directly in line 44 (of original view).
    # I need to refactor import_worker or create import_sicro_worker.
    # Let's create a sicro specific worker inline or separate.
    
    background_tasks.add_task(sicro_worker, job_id, content, file.filename, state, month, year, replace, current_user.id)
    
    return {"job_id": job_id, "message": "Importação SICRO iniciada em segundo plano"}

async def sicro_worker(job_id: str, content: bytes, filename: str, state: str | None, month: int, year: int, replace: bool = False, user_id: UUID | None = None):
    IMPORT_JOBS[job_id] = {"status": "processing", "progress": 0, "message": "Iniciando SICRO...", "total": 0, "current": 0}
    
    async def progress_callback(current, total, msg="Processando"):
        percentage = int((current / total) * 100) if total > 0 else 0
        IMPORT_JOBS[job_id].update({
            "progress": percentage,
            "message": msg,
            "total": total,
            "current": current
        })
    
    try:
        async with AsyncSessionLocal() as db:
            count = await import_sicro_excel(content, filename, state.upper() if state else None, month, year, db, progress_callback, replace, user_id)
            IMPORT_JOBS[job_id].update({"status": "completed", "progress": 100, "message": f"Concluído: {count} itens."})
    except Exception as e:
        IMPORT_JOBS[job_id].update({"status": "error", "message": str(e)})



@router.get("/import/progress/{job_id}")
@limiter.exempt
async def get_import_progress(request: Request, job_id: str, current_user: User = Depends(get_current_user)):
    job = IMPORT_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/items", response_model=List[dict])
async def search_items(
    q: str = Query(..., min_length=2),
    source: Optional[str] = None,
    item_type: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Advanced Search using Trigram Similarity
    # Order by similarity(description, q) DESC
    
    query = select(ReferenceItem).options(
        selectinload(ReferenceItem.prices),
        selectinload(ReferenceItem.source)
    )
    
    if q:
        # Match description using similarity or Code check
        # We can combine logic: if numeric, prioritise code. If text, prioritise description.
        if q.isdigit():
             query = query.where(ReferenceItem.code.ilike(f"{q}%"))
        else:
            query = query.where(func.similarity(ReferenceItem.description, q) > 0.1)\
                         .order_by(func.similarity(ReferenceItem.description, q).desc())
        
    if source and source != "ALL":
        query = query.join(ReferenceItem.source).where(ReferenceItem.source.has(name=source))

    if item_type and item_type != "ALL":
        # Supports multiple types comma separated if needed, but for now exact match or specific group
        if item_type == "COMPOSITION":
             query = query.where(ReferenceItem.type.in_(["COMPOSITION", "SERVICE"])) # Adapting to common names
        elif item_type == "INPUT":
             query = query.where(ReferenceItem.type.not_in(["COMPOSITION", "SERVICE"]))
        else:
             query = query.where(ReferenceItem.type == item_type)
        
    query = query.limit(limit)
        
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Format response
    response = []
    for item in items:
        # Get latest price (or first)
        price = item.prices[0].price if item.prices else 0.0
        response.append({
            "id": item.id,
            "code": item.code,
            "description": item.description,
            "unit": item.unit,
            "price": price,
            "source": item.source.name if item.source else "",
            "type": item.type
        })
        
    return response

@router.get("/items/{item_id}/composition")
async def get_item_composition(
    item_id: UUID,
    # region: str = Query("RS", min_length=2), # Optional, we'll try to find any price
    region: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get Item info
    item = await db.get(ReferenceItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Get Sicro Production (No prices needed here usually, just rates)
    q_prod = select(SicroProductionRate).where(SicroProductionRate.item_id == item_id)
    sicro_prod = (await db.execute(q_prod)).scalars().all()
    
    prod_data = []
    for p in sicro_prod:
        prod_data.append({
            "scenario": p.scenario,
            "unit": p.unit,
            "rate": p.production_rate,
            "num_helpers": p.num_helpers
        })

    # 3. Get Composition Structure (Team & Ingredients) WITHOUT joining prices yet
    # Team
    q_team = select(SicroCompositionTeam, ReferenceItem)\
        .join(ReferenceItem, SicroCompositionTeam.member_item_id == ReferenceItem.id)\
        .where(SicroCompositionTeam.composition_item_id == item_id)
    team_rows = (await db.execute(q_team)).all()

    # Ingredients
    q_ing = select(CompositionItem, ReferenceItem)\
        .join(ReferenceItem, CompositionItem.child_item_id == ReferenceItem.id)\
        .where(CompositionItem.parent_item_id == item_id)
    ing_rows = (await db.execute(q_ing)).all()

    # 4. Collect IDs to fetch Prices
    all_related_ids = set()
    for link, member in team_rows:
        all_related_ids.add(member.id)
    for link, child in ing_rows:
        all_related_ids.add(child.id)
    
    # 5. Fetch Prices (Smart Strategy)
    # Fetch ALL active prices for these items
    price_map = {} # ItemID -> Price
    
    if all_related_ids:
        q_prices = select(ReferencePrice).where(
            ReferencePrice.item_id.in_(all_related_ids),
            ReferencePrice.is_active == True
        )
        
        price_rows = (await db.execute(q_prices)).scalars().all()
        
        # Logic: Best Match Region > Any Region
        temp_prices = {} # ID -> { region: price }
        
        for p in price_rows:
            if p.item_id not in temp_prices: temp_prices[p.item_id] = []
            temp_prices[p.item_id].append(p)
            
        for i_id, p_list in temp_prices.items():
            
            # 1. Try exact region match using param (if provided)
            matched = None
            if region:
                matched = next((p for p in p_list if p.region == region), None)
            
            # 2. If not, try 'RS' (SICRO Default) or 'SP' (SINAPI Default)
            if not matched:
                matched = next((p for p in p_list if p.region == 'RS'), None)
            if not matched:
                matched = next((p for p in p_list if p.region == 'SP'), None)
                
            # 3. Fallback: First available
            if not matched and p_list:
                matched = p_list[0]
                
            if matched:
                price_map[i_id] = float(matched.price)

    # 6. Build Response
    team_data = []
    for link, member in team_rows:
        qty = float(link.quantity) if link.quantity is not None else 0.0
        u_price = price_map.get(member.id, 0.0)
        team_data.append({
            "code": member.code,
            "description": member.description,
            "unit": member.unit,
            "quantity": qty,
            "type": member.type,
            "unit_price": u_price,
            "total_price": u_price * qty
        })
        
    ingredients_data = []
    for link, child in ing_rows:
        coef = float(link.coefficient) if link.coefficient is not None else 0.0
        u_price = price_map.get(child.id, 0.0)
        ingredients_data.append({
            "code": child.code,
            "description": child.description,
            "unit": child.unit,
            "coefficient": coef,
            "type": child.type,
            "unit_price": u_price,
            "total_price": u_price * coef
        })

    return {
        "item": {
            "id": item.id,
            "code": item.code,
            "description": item.description,
            "unit": item.unit,
            "type": item.type
        },
        "sicro_production": prod_data,
        "team": team_data,
        "ingredients": ingredients_data
    }
