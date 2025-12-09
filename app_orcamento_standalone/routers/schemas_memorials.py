from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class MemorialBase(BaseModel):
    title: str
    content: str
    source_document: Optional[str] = None

class MemorialCreate(MemorialBase):
    pass

class MemorialUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    source_document: Optional[str] = None

class MemorialResponse(MemorialBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class ItemMemorialLink(BaseModel):
    item_id: UUID
    memorial_id: UUID
    relevance_score: float = 1.0
