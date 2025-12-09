from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from auth.dependencies import get_current_user
from models import User, BudgetItem, Measurement
from pydantic import BaseModel
from typing import List, Dict, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

router = APIRouter(prefix="/measurements", tags=["Control"])

class MeasurementCreate(BaseModel):
    budget_item_id: UUID
    measurement_date: date
    quantity: Decimal
    milestone_name: Optional[str] = None

class MeasurementResponse(BaseModel):
    id: UUID
    budget_item_id: UUID
    measurement_date: date
    quantity_measured: Decimal
    value_measured: Decimal
    milestone_name: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.post("/", response_model=MeasurementResponse)
async def create_measurement(
    mes_in: MeasurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registers a new measurement for a budget item.
    """
    # Get Item
    item = await db.get(BudgetItem, mes_in.budget_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Check total already measured
    stmt = select(func.sum(Measurement.quantity_measured)).where(Measurement.budget_item_id == mes_in.budget_item_id)
    measured_total = (await db.execute(stmt)).scalar() or Decimal(0)
    
    if measured_total + mes_in.quantity > item.quantity:
        raise HTTPException(status_code=400, detail=f"Measurement exceeds budget. Budget: {item.quantity}, Measured: {measured_total}, Requested: {mes_in.quantity}")
        
    # Calculate Value (Qty * Unit Price with BDI? Or clean?)
    # Usually measurement pays the Price with BDI (Contract Price)
    # item.total_price is Qty * Unit * (1+BDI).
    # Unit price with BDI:
    unit_price_bdi = item.unit_price * (1 + item.bdi_applied / 100)
    value_measured = mes_in.quantity * unit_price_bdi
    
    new_mes = Measurement(
        budget_item_id=mes_in.budget_item_id,
        measurement_date=mes_in.measurement_date,
        quantity_measured=mes_in.quantity,
        value_measured=value_measured,
        milestone_name=mes_in.milestone_name
    )
    db.add(new_mes)
    await db.commit()
    await db.refresh(new_mes)
    
    return new_mes

@router.get("/budget/{budget_id}", response_model=List[MeasurementResponse])
async def list_measurements(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all measurements for a budget.
    """
    stmt = select(Measurement).join(BudgetItem).where(BudgetItem.budget_id == budget_id)
    result = await db.execute(stmt)
    return result.scalars().all()
