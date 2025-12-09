from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from auth.dependencies import get_current_user
from models import User, Memorial, ItemMemorial, ReferenceItem
from routers.schemas_memorials import MemorialCreate, MemorialUpdate, MemorialResponse, ItemMemorialLink
from typing import List
from uuid import UUID

router = APIRouter(prefix="/memorials", tags=["Memorials"])

@router.post("/", response_model=MemorialResponse)
async def create_memorial(
    memorial_in: MemorialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Admins/Owners should create shared memorials? 
    # Or maybe tenant specific?
    # Schema says `memorials` is global (no tenant_id). So only ADMIN role should edit.
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_memorial = Memorial(
        title=memorial_in.title,
        content=memorial_in.content,
        source_document=memorial_in.source_document
    )
    db.add(new_memorial)
    await db.commit()
    await db.refresh(new_memorial)
    return new_memorial

@router.get("/{memorial_id}", response_model=MemorialResponse)
async def get_memorial(
    memorial_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    memorial = await db.get(Memorial, memorial_id)
    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial not found")
    return memorial

@router.post("/link", response_model=ItemMemorialLink)
async def link_item_to_memorial(
    link_in: ItemMemorialLink,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check existence
    item = await db.get(ReferenceItem, link_in.item_id)
    memorial = await db.get(Memorial, link_in.memorial_id)
    
    if not item or not memorial:
        raise HTTPException(status_code=404, detail="Item or Memorial not found")
        
    link = ItemMemorial(
        item_id=link_in.item_id,
        memorial_id=link_in.memorial_id,
        relevance_score=link_in.relevance_score
    )
    db.add(link)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Link already exists")
        
    return link_in

@router.get("/item/{item_id}", response_model=List[MemorialResponse])
async def get_memorials_for_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Join ItemMemorial to get Memorials
    query = select(Memorial).join(ItemMemorial).where(ItemMemorial.item_id == item_id)
    result = await db.execute(query)
    return result.scalars().all()
