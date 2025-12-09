from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete, update, func
from sqlalchemy.orm import selectinload
from database import get_db
from auth.dependencies import get_current_user
from models import User, Project, ProjectBudget, BudgetItem, ReferenceItem, ReferencePrice, CompositionItem, SicroProductionRate
from routers.schemas_projects import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetItemCreate, BudgetItemBase, BudgetItemResponse, BudgetItemUpdate
from routers.schemas_composition import CompositionResponse, CompositionItemResponse, ReferenceItemResponse
from routers.schemas_pagination import PaginationParams, PaginatedResponse
from utils.pagination import paginate_response
from utils.eager_loading import eager_load_budget_items, eager_load_budgets_with_items
from typing import List, Optional
from uuid import UUID
from datetime import date

router = APIRouter(prefix="/budgets", tags=["Budgets"])

from models import User, Project, ProjectBudget, BudgetItem, ReferenceItem, ReferencePrice, CompositionItem, SicroProductionRate, ReferenceSource, BDIConfiguration

@router.post("/", response_model=BudgetResponse)
async def create_budget(
    budget_in: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_query = select(Project).where(
        Project.id == budget_in.project_id,
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    project = (await db.execute(project_query)).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Project is in trash")

    new_budget = ProjectBudget(
        project_id=budget_in.project_id,
        name=budget_in.name,
        reference_date=budget_in.reference_date,
        status=budget_in.status
    )
    db.add(new_budget)
    await db.flush() # Generate ID for new_budget

    # Create default BDI Configuration
    new_bdi = BDIConfiguration(budget_id=new_budget.id)
    db.add(new_bdi)
    
    await db.commit()
    
    # Refresh with eager loading
    query = select(ProjectBudget).where(ProjectBudget.id == new_budget.id).options(selectinload(ProjectBudget.bdi_config))
    new_budget = (await db.execute(query)).scalars().first()
    
    return new_budget

@router.get("/config/available-dates")
async def get_available_price_dates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch distinct month/year combinations available in price data"""
    from sqlalchemy import extract, distinct
    
    query = select(
        extract('month', ReferencePrice.date_validity).label('month'),
        extract('year', ReferencePrice.date_validity).label('year')
    ).where(
        ReferencePrice.is_active == True,
        ReferencePrice.date_validity.isnot(None)
    ).distinct().order_by(
        extract('year', ReferencePrice.date_validity).desc(),
        extract('month', ReferencePrice.date_validity).desc()
    )
    
    result = await db.execute(query)
    dates = []
    for row in result.all():
        if row.month and row.year:
            dates.append({
                "month": int(row.month),
                "year": int(row.year),
                "label": f"{int(row.month):02d}/{int(row.year)}"
            })
    
    # Also get distinct regions
    region_query = select(distinct(ReferencePrice.region)).where(
        ReferencePrice.is_active == True,
        ReferencePrice.region.isnot(None)
    ).order_by(ReferencePrice.region)
    
    region_result = await db.execute(region_query)
    regions = [r[0] for r in region_result.all() if r[0]]
    
    return {"dates": dates, "regions": regions}

@router.post("/{budget_id}/recalculate-prices")
async def recalculate_budget_prices(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recalculate all item prices based on current budget config (region, month, year, charge_type)"""
    # Get budget with config
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Get all items
    items_query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
    items_result = await db.execute(items_query)
    items = items_result.scalars().all()
    
    updated_count = 0
    
    for item in items:
        if not item.reference_item_id:
            continue
        
        # Build date filter
        from datetime import date as date_type
        target_date = date_type(budget.price_year or 2024, budget.price_month or 1, 1)
        
        # Find price for this item matching budget config
        price_query = select(ReferencePrice).where(
            ReferencePrice.item_id == item.reference_item_id,
            ReferencePrice.region == (budget.price_region or "RS"),
            ReferencePrice.charge_type == (budget.social_charges_type or "DESONERADO"),
            ReferencePrice.is_active == True
        ).order_by(
            func.abs(func.extract('epoch', ReferencePrice.date_validity) - func.extract('epoch', target_date))
        ).limit(1)
        
        price_result = await db.execute(price_query)
        price_obj = price_result.scalars().first()
        
        if price_obj:
            item.unit_price = price_obj.price
            updated_count += 1
    
    # Recalculate total
    await db.commit()
    await recalculate_budget_total(budget_id, db)
    
    return {"message": f"Preços atualizados para {updated_count} itens", "updated_count": updated_count}

@router.get("/project/{project_id}", response_model=PaginatedResponse[BudgetResponse])
async def list_budgets_by_project(
    project_id: UUID,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify tenant
    project_query = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    project = (await db.execute(project_query)).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Project is in trash")

    filters = [
        ProjectBudget.project_id == project_id,
        ProjectBudget.deleted_at.is_(None)
    ]
    
    return await paginate_response(
        db=db,
        model=ProjectBudget,
        pagination=pagination,
        response_model=BudgetResponse,
        filters=filters,
        order_by=ProjectBudget.created_at.desc(),
        options=[selectinload(ProjectBudget.bdi_config)]
    )

@router.get("/trash", response_model=PaginatedResponse[BudgetResponse])
async def list_budgets_trash(
    project_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filters = [
        ProjectBudget.deleted_at.is_not(None),
        Project.tenant_id == current_user.tenant_id
    ]

    if project_id:
        filters.append(ProjectBudget.project_id == project_id)

    return await paginate_response(
        db=db,
        model=ProjectBudget,
        pagination=pagination,
        response_model=BudgetResponse,
        filters=filters,
        join_relationships=[Project],
        order_by=ProjectBudget.deleted_at.desc(),
        options=[selectinload(ProjectBudget.bdi_config)]
    )

@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    ).options(selectinload(ProjectBudget.bdi_config))
    result = await db.execute(query)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget

@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: UUID,
    budget_update: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update budget configuration (state, month, year, charges, BDIs)"""
    query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    ).options(selectinload(ProjectBudget.bdi_config))
    result = await db.execute(query)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Update fields
    update_data = budget_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(budget, key):
            setattr(budget, key, value)
    
    await db.commit()
    await db.refresh(budget)
    return budget

@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    result = await db.execute(query)
    budget = result.scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Soft Delete
    budget.deleted_at = func.now()
    budget.deleted_by_id = current_user.id
    budget.deleted_reason = reason
    budget.restored_at = None
    budget.restored_by_id = None
    await db.commit()

    return {"message": "Budget moved to trash"}


@router.get("/trash", response_model=PaginatedResponse[BudgetResponse])
async def list_budgets_trash(
    project_id: Optional[UUID] = None,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filters = [
        ProjectBudget.deleted_at.is_not(None),
        Project.tenant_id == current_user.tenant_id
    ]

    if project_id:
        filters.append(ProjectBudget.project_id == project_id)

    return await paginate_response(
        db=db,
        model=ProjectBudget,
        pagination=pagination,
        response_model=BudgetResponse,
        filters=filters,
        join_relationships=[Project],
        order_by=ProjectBudget.deleted_at.desc(),
        options=[selectinload(ProjectBudget.bdi_config)]
    )


@router.post("/{budget_id}/restore", response_model=BudgetResponse)
async def restore_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_not(None),
        Project.tenant_id == current_user.tenant_id
    ).options(selectinload(ProjectBudget.bdi_config))
    budget = (await db.execute(query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found in trash")

    # Block restore if project is still in trash
    project = await db.get(Project, budget.project_id)
    if project and project.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Restore project before restoring its budgets")

    budget.deleted_at = None
    budget.deleted_by_id = None
    budget.deleted_reason = None
    budget.restored_at = func.now()
    budget.restored_by_id = current_user.id

    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{budget_id}/hard")
async def hard_delete_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.deleted_at is None:
        raise HTTPException(status_code=400, detail="Hard delete only allowed from trash")

    await db.delete(budget)
    await db.commit()
    return {"message": "Budget permanently deleted. This action is irreversible."}

# --- Budget Items ---

@router.post("/{budget_id}/items", response_model=BudgetItemResponse)
async def add_budget_item(
    budget_id: UUID,
    item_in: BudgetItemBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: add_budget_item called. Budget: {budget_id}, Item: {item_in}")
    # Verify budget
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        print("DEBUG: Budget not found")
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Budget is in trash")
    
    # ... rest of function ...
    
    # If reference_item_id is provided, verify it exists and get price
    unit_price = item_in.unit_price

    if item_in.reference_item_id:
        ref_item = await db.get(ReferenceItem, item_in.reference_item_id)
        if not ref_item:
            print("DEBUG: Reference Item not found in DB")
            raise HTTPException(status_code=404, detail="Reference Item not found")

        # Auto-fetch price if not provided (snapshotting)
        if unit_price == 0:
            # Determine charge type from budget (default to DESONERADO if not set)
            charge_type = budget.social_charges_type or "DESONERADO"
            
            price_query = select(ReferencePrice).where(
                ReferencePrice.item_id == ref_item.id,
                ReferencePrice.is_active == True,
                ReferencePrice.charge_type == charge_type
            ).order_by(ReferencePrice.date_validity.desc()).limit(1)
            price_res = await db.execute(price_query)
            price_obj = price_res.scalars().first()
            if price_obj:
                unit_price = price_obj.price

    new_item = BudgetItem(
        budget_id=budget_id,
        reference_item_id=item_in.reference_item_id,
        custom_code=item_in.custom_code,
        custom_description=item_in.custom_description,
        quantity=item_in.quantity,
        unit_price=unit_price,
        bdi_applied=item_in.bdi_applied if item_in.bdi_applied is not None else 0,
        parent_id=item_in.parent_id,
        numbering=item_in.numbering,
        item_type=item_in.item_type
    )
    db.add(new_item)
    await db.commit()
    
    # Reload item with reference_item relationship for proper serialization
    from sqlalchemy.orm import selectinload
    stmt = select(BudgetItem).where(BudgetItem.id == new_item.id).options(selectinload(BudgetItem.reference_item))
    result = await db.execute(stmt)
    new_item = result.scalars().first()
    
    print(f"DEBUG: new_item loaded: {new_item}")
    print(f"DEBUG: reference_item: {new_item.reference_item if new_item else None}")
    
    # Recalculate total
    await recalculate_budget_total(budget_id, db)
    
    try:
        return new_item
    except Exception as e:
        print(f"DEBUG ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise

@router.delete("/{budget_id}/items/{item_id}")
async def delete_budget_item(
    budget_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check ownership
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Budget is in trash")

    item = await db.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Item already deleted")

    # Soft delete
    from datetime import datetime
    item.deleted_at = datetime.utcnow()
    item.deleted_by_id = current_user.id
    
    await db.commit()
    await recalculate_budget_total(budget_id, db)
    return {"message": "Item moved to trash"}

@router.patch("/{budget_id}/items/{item_id}", response_model=BudgetItemResponse)
async def update_budget_item(
    budget_id: UUID,
    item_id: UUID,
    item_update: BudgetItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check ownership
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        ProjectBudget.deleted_at.is_(None),
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Budget is in trash")

    item = await db.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update fields
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    
    # Recalculate numbering if changed? (Future task)
    
    await db.commit()
    await recalculate_budget_total(budget_id, db)
    
    # Reload with relationship
    from sqlalchemy.orm import selectinload
    stmt = select(BudgetItem).where(BudgetItem.id == item_id).options(selectinload(BudgetItem.reference_item))
    result = await db.execute(stmt)
    return result.scalars().first()

async def recalculate_budget_total(budget_id: UUID, db: AsyncSession):
    query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
    result = await db.execute(query)
    items = result.scalars().all()
    
    total = sum(item.total_price for item in items)
    
    budget = await db.get(ProjectBudget, budget_id)
    if budget:
        budget.total_value = total
        await db.commit()

@router.get("/{budget_id}/items", response_model=List[BudgetItemResponse])
async def list_budget_items(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id, 
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    # Eager load reference item with source for complete display
    # Filter out soft-deleted items
    query = select(BudgetItem).where(
        BudgetItem.budget_id == budget_id,
        BudgetItem.deleted_at.is_(None)
    )
    query = eager_load_budget_items(query)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{budget_id}/items/trash", response_model=List[BudgetItemResponse])
async def list_deleted_items(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List soft-deleted items in trash"""
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id, 
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    query = select(BudgetItem).where(
        BudgetItem.budget_id == budget_id,
        BudgetItem.deleted_at.isnot(None)
    )
    query = eager_load_budget_items(query)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{budget_id}/items/{item_id}/restore")
async def restore_budget_item(
    budget_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restore a soft-deleted item from trash"""
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    item = await db.get(BudgetItem, item_id)
    if not item or item.budget_id != budget_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.deleted_at is None:
        raise HTTPException(status_code=400, detail="Item is not in trash")
    
    item.deleted_at = None
    item.deleted_by_id = None
    
    await db.commit()
    await recalculate_budget_total(budget_id, db)
    return {"message": "Item restored"}

# --- Composition Catalog & Details ---

@router.get("/catalog/search", response_model=List[ReferenceItemResponse])
async def search_catalog(
    q: Optional[str] = None,
    source: Optional[str] = None, # SINAPI, SICRO
    unit: Optional[str] = None,
    type: Optional[str] = None, # COMPOSITION, INPUT
    input_type: Optional[str] = None, # Material, Equipment, etc.
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only authenticated users can search catalog
    query = select(ReferenceItem)

    if source:
        query = query.join(ReferenceSource).where(ReferenceSource.name == source)

    if q:
        query = query.where(or_(
            ReferenceItem.code.ilike(f"%{q}%"),
            ReferenceItem.description.ilike(f"%{q}%")
        ))
    
    if unit:
        query = query.where(ReferenceItem.unit.ilike(f"{unit}"))
        
    if type:
        # SINAPI imports services as 'SERVICE', not 'COMPOSITION'
        # Map 'COMPOSITION' to include SERVICE for backwards compatibility
        if type == "COMPOSITION":
            query = query.where(ReferenceItem.type.in_(["COMPOSITION", "SERVICE"]))
        else:
            query = query.where(ReferenceItem.type == type)

    query = query.offset(skip).limit(limit)
    print(f"DEBUG: Executing search query: q={q}, source={source}")
    result = await db.execute(query)
    items = result.scalars().all()
    print(f"DEBUG: Found {len(items)} items")
    return items

@router.get("/composition/{item_id}", response_model=CompositionResponse)
async def get_composition_details(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get Master Item
    item = await db.get(ReferenceItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # 2. Get Child Items with join
    stmt = select(CompositionItem, ReferenceItem).join(ReferenceItem, CompositionItem.child_item_id == ReferenceItem.id).where(CompositionItem.parent_item_id == item_id)
    result_join = await db.execute(stmt)
    children_data = result_join.all()

    # 3. Collect all child IDs to batch fetch prices
    child_ids = [child_item.id for _, child_item in children_data]
    
    # 4. Fetch prices for all children in one query
    from models import ReferencePrice
    price_map = {}
    if child_ids:
        price_query = select(ReferencePrice).where(
            ReferencePrice.item_id.in_(child_ids),
            ReferencePrice.is_active == True
        ).order_by(ReferencePrice.date_validity.desc())
        price_result = await db.execute(price_query)
        
        # Build price map (first active price per item)
        for price in price_result.scalars().all():
            if price.item_id not in price_map:
                price_map[price.item_id] = float(price.price)

    # 5. Build response with prices
    items_response = []
    total_cost = 0.0
    for comp_link, child_item in children_data:
        unit_price = price_map.get(child_item.id, 0.0)
        coef = float(comp_link.coefficient) if comp_link.coefficient else 0.0
        item_total = unit_price * coef
        total_cost += item_total
        
        items_response.append({
            "id": comp_link.id,
            "child_item_id": child_item.id,
            "coefficient": coef,
            "child_code": child_item.code,
            "child_description": child_item.description,
            "child_unit": child_item.unit,
            "child_price": unit_price,
            "child_type": child_item.type
        })

    # 6. Check for SICRO production
    prod_rate = None
    if item.methodology == "PRODUCTION":
        sicro_q = select(SicroProductionRate).where(SicroProductionRate.item_id == item_id)
        sicro_res = await db.execute(sicro_q)
        sicro_obj = sicro_res.scalars().first()
        if sicro_obj:
            prod_rate = sicro_obj.production_hourly

    return {
        "id": item.id,
        "code": item.code,
        "description": item.description,
        "unit": item.unit,
        "type": item.type,
        "price": total_cost,
        "items": items_response,
        "production_hourly": prod_rate
    }

@router.get("/{budget_id}/structure")
async def get_budget_structure(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the budget items organized in a WBS hierarchy with calculated totals.
    """
    # Verify access
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id, 
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    # Fetch all items
    query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
    query = eager_load_budget_items(query)
    result = await db.execute(query)
    items = result.scalars().all()
    
    from services.budget_structure import build_budget_hierarchy
    hierarchy = build_budget_hierarchy(items)
    
    return hierarchy
    return hierarchy

@router.post("/{budget_id}/renumber")
async def renumber_budget_items(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auto-generates numbering (1.1, 1.1.1) for all items in the budget based on hierarchy.
    """
    # Verify access
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id, 
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    # Fetch all items
    query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
    result = await db.execute(query)
    items = result.scalars().all()
    
    from services.budget_structure import renumber_items
    updates_map = renumber_items(items)
    
    # Apply updates
    for item in items:
        if item.id in updates_map:
            item.numbering = updates_map[item.id]
            
    await db.commit()
    
    return {"message": "Renumbering complete", "updated_count": len(updates_map)}

from routers.schemas_projects import BDIConfigBase, BDIConfigResponse

@router.put("/{budget_id}/bdi", response_model=BDIConfigResponse)
async def update_budget_bdi(
    budget_id: UUID,
    bdi_in: BDIConfigBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates BDI configuration for a budget and recalculates all item prices.
    """
    stmt = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id, 
        Project.tenant_id == current_user.tenant_id
    ).options(selectinload(ProjectBudget.bdi_config))
    
    budget = (await db.execute(stmt)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    # Get or Create BDI Config
    bdi_config = budget.bdi_config
    if not bdi_config:
        bdi_config = BDIConfiguration(budget_id=budget_id)
        db.add(bdi_config)
    
    # Update fields
    data = bdi_in.model_dump()
    for k, v in data.items():
        setattr(bdi_config, k, v)
        
    # Calculate Rate
    from services.pricing import calculate_bdi_rate
    calced_rate = calculate_bdi_rate(bdi_config)
    
    # Update calculated fields (store as percentage e.g. 25.4)
    rate_percent = calced_rate * 100
    bdi_config.total_bdi_services = rate_percent
    bdi_config.total_bdi_materials = rate_percent 
    bdi_config.total_bdi_equipment = rate_percent
    
    # Apply to all items
    from sqlalchemy import update
    await db.execute(
        update(BudgetItem)
        .where(BudgetItem.budget_id == budget_id)
        .values(bdi_applied=rate_percent)
    )
    
    await db.commit()
    await db.refresh(bdi_config)
    
    await recalculate_budget_total(budget_id, db)
    
    return bdi_config
