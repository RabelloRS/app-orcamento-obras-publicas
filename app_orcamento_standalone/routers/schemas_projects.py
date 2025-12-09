from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

# --- Project Schemas ---

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    deleted_at: Optional[datetime] = None
    deleted_by_id: Optional[UUID] = None
    deleted_reason: Optional[str] = None
    restored_at: Optional[datetime] = None
    restored_by_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True

# --- Budget Schemas ---

class BudgetBase(BaseModel):
    name: str
    reference_date: date
    status: str = "DRAFT"

class BudgetCreate(BudgetBase):
    project_id: UUID

class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    reference_date: Optional[date] = None
    status: Optional[str] = None
    social_charges_type: Optional[str] = None
    price_region: Optional[str] = None
    price_month: Optional[int] = None
    price_year: Optional[int] = None
    bdi_normal: Optional[Decimal] = None
    bdi_diferenciado: Optional[Decimal] = None

class BDIConfigBase(BaseModel):
    administration_rate: Decimal = Decimal("0.0300")
    financial_expenses_rate: Decimal = Decimal("0.0059")
    insurance_rate: Decimal = Decimal("0.0080")
    risk_rate: Decimal = Decimal("0.0127")
    profit_rate: Decimal = Decimal("0.0740")
    pis_rate: Decimal = Decimal("0.0065")
    cofins_rate: Decimal = Decimal("0.0300")
    iss_rate: Decimal = Decimal("0.0500")
    cprb_rate: Decimal = Decimal("0.0450")

class BDIConfigResponse(BDIConfigBase):
    id: UUID
    budget_id: UUID
    total_bdi_services: Optional[Decimal] = None
    total_bdi_materials: Optional[Decimal] = None
    
    class Config:
        from_attributes = True

class BudgetResponse(BudgetBase):
    id: UUID
    project_id: UUID
    total_value: Decimal
    created_at: datetime
    social_charges_type: Optional[str] = "DESONERADO"
    price_region: Optional[str] = "RS"
    price_month: Optional[int] = 1
    price_year: Optional[int] = 2024
    bdi_normal: Optional[Decimal] = Decimal("25.0")
    bdi_diferenciado: Optional[Decimal] = Decimal("15.0")
    bdi_config: Optional[BDIConfigResponse] = None
    deleted_at: Optional[datetime] = None
    deleted_by_id: Optional[UUID] = None
    deleted_reason: Optional[str] = None
    restored_at: Optional[datetime] = None
    restored_by_id: Optional[UUID] = None
    
    class Config:
        from_attributes = True

# --- Budget Item Schemas ---

class ReferenceItemSimple(BaseModel):
    """Simplified reference item for embedding in budget items"""
    id: UUID
    code: str
    description: str
    unit: str
    type: str
    source_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class BudgetItemBase(BaseModel):
    reference_item_id: Optional[UUID] = None
    custom_code: Optional[str] = None
    custom_description: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    bdi_applied: Optional[Decimal] = None
    bdi_type: Optional[str] = "NORMAL"
    parent_id: Optional[UUID] = None
    numbering: Optional[str] = ""
    item_type: Optional[str] = "ITEM"

class BudgetItemCreate(BudgetItemBase):
    budget_id: UUID

class BudgetItemResponse(BudgetItemBase):
    id: UUID
    budget_id: UUID
    total_price: Decimal
    reference_item: Optional[ReferenceItemSimple] = None
    
    class Config:
        from_attributes = True

class BudgetItemUpdate(BaseModel):
    """Schema for updating budget items"""
    quantity: Optional[Decimal] = None
    custom_description: Optional[str] = None
    bdi_applied: Optional[Decimal] = None
    bdi_type: Optional[str] = None
    unit_price: Optional[Decimal] = None
    numbering: Optional[str] = None
    parent_id: Optional[UUID] = None
    item_type: Optional[str] = None
