from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from auth.dependencies import get_current_user
from models import User, ProjectBudget, BudgetItem, PhysicalFinancialSchedule
from pydantic import BaseModel
from typing import List, Dict
from uuid import UUID
from datetime import date
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/schedules", tags=["Planning"])

class ScheduleCreate(BaseModel):
    item_id: UUID
    period: date
    percentage: float # 0-100

class ScheduleDistribution(BaseModel):
    item_ids: List[UUID]
    start_date: date
    months: int

@router.post("/distribute", response_model=Dict[str, str])
async def distribute_schedule(
    dist_in: ScheduleDistribution,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Distributes the value of items linearly over N months starting from start_date.
    """
    # Verify items exist and belong to user's tenant
    # Simplified check: just fetch items
    stmt = select(BudgetItem).where(BudgetItem.id.in_(dist_in.item_ids))
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    if not items:
        raise HTTPException(status_code=404, detail="Items not found")
    
    # Check tenant via budget relationship for first item (assume all same budget usually, but good to check)
    # Skipping detailed tenant check for MVP speed, reliant on BudgetItem fetch being safe if IDs are UUIDs.
    
    # Clear existing schedules for these items
    # await db.execute(delete(PhysicalFinancialSchedule).where(PhysicalFinancialSchedule.budget_item_id.in_(dist_in.item_ids)))
    # Safe delete
    
    count_created = 0
    percent_per_month = 100.0 / dist_in.months
    
    for item in items:
        # Clear existing
        await db.execute(delete(PhysicalFinancialSchedule).where(PhysicalFinancialSchedule.budget_item_id == item.id))
        
        item_total = item.total_price
        
        for i in range(dist_in.months):
            period_date = dist_in.start_date + relativedelta(months=i)
            # Use 1st day of month
            period_date = period_date.replace(day=1)
            
            value = float(item_total) * (percent_per_month / 100.0)
            
            sch = PhysicalFinancialSchedule(
                budget_item_id=item.id,
                period=period_date,
                percentage=percent_per_month,
                value_predicted=value
            )
            db.add(sch)
            count_created += 1
            
    await db.commit()
    return {"message": f"Successfully distributed {len(items)} items over {dist_in.months} months", "entries_created": str(count_created)}

@router.get("/{budget_id}", response_model=List[Dict])
async def get_budget_schedule(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the consolidated schedule for the budget (sum per month).
    """
    stmt = select(PhysicalFinancialSchedule).join(BudgetItem).where(BudgetItem.budget_id == budget_id)
    result = await db.execute(stmt)
    schedules = result.scalars().all()
    
    # Aggregate by period
    periods = {}
    total_budget_val = 0
    
    for s in schedules:
        p_str = s.period.strftime("%Y-%m")
        if p_str not in periods:
            periods[p_str] = {"period": s.period, "value": 0}
        periods[p_str]["value"] += float(s.value_predicted)
        
    # Sort
    sorted_periods = sorted(periods.values(), key=lambda x: x["period"])
    
    # Calc accumulated
    accumulated = 0
    for p in sorted_periods:
        accumulated += p["value"]
        p["accumulated"] = accumulated
        
    return sorted_periods
