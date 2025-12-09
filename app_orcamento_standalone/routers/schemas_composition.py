from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal
from uuid import UUID

class CompositionItemResponse(BaseModel):
    id: int
    child_item_id: UUID
    coefficient: Decimal
    child_code: str
    child_description: str
    child_unit: str
    child_price: Optional[Decimal]
    child_type: str

    class Config:
        from_attributes = True

class CompositionResponse(BaseModel):
    id: UUID
    code: str
    description: str
    unit: str
    type: str # COMPOSITION
    price: Optional[Decimal]
    items: List[CompositionItemResponse] = []
    production_hourly: Optional[Decimal] = None

    class Config:
        from_attributes = True

class ReferenceItemResponse(BaseModel):
    id: UUID
    code: str
    description: str
    unit: str
    type: str
    methodology: str

    class Config:
        from_attributes = True
