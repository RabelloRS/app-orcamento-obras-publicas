from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from auth.dependencies import get_current_user
from models import User, Project, ProjectBudget, BudgetItem, ReferenceItem
from uuid import UUID
from datetime import date
from decimal import Decimal
from typing import List, Dict

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/curve-abc/{budget_id}")
async def get_abc_curve(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    # Fetch items
    items_query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
    items = (await db.execute(items_query)).scalars().all()

    # Process ABC
    # A: Top 20% items accounting for ~80% value
    # B: Next 30% items accounting for ~15% value
    # C: Bottom 50% items accounting for ~5% value

    # Calculate totals
    data = []
    total_budget = Decimal(0)

    for item in items:
        # Check custom or reference description
        desc = item.custom_description
        if not desc and item.reference_item_id:
            # We would need to eager load reference_item in query for efficiency
            # For now assuming custom_description is populated or we handle it in frontend
            pass

        val = item.total_price
        total_budget += val
        data.append({
            "item_id": item.id,
            "value": val,
            "description": item.custom_description or "Item"
        })

    # Sort descending
    data.sort(key=lambda x: x["value"], reverse=True)

    accumulated = Decimal(0)
    result_abc = []

    for entry in data:
        accumulated += entry["value"]
        percentage = (entry["value"] / total_budget) * 100 if total_budget > 0 else 0
        accumulated_percentage = (accumulated / total_budget) * 100 if total_budget > 0 else 0

        category = 'C'
        if accumulated_percentage <= 80:
            category = 'A'
        elif accumulated_percentage <= 95:
            category = 'B'

        result_abc.append({
            **entry,
            "percentage": round(percentage, 2),
            "accumulated_percentage": round(accumulated_percentage, 2),
            "category": category
        })

    return {"total_value": total_budget, "abc_items": result_abc}

@router.get("/curve-s/{project_id}")
async def get_s_curve(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock S-Curve based on Budgets reference dates or Schedule
    # Real implementation needs the Schedule table populated
    return {"message": "S-Curve calculation requires schedule data."}
