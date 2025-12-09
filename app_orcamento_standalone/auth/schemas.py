from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    tenant_id: Optional[str] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: str
    cnpj: str

class UserCreateInternal(BaseModel):
    """Used by Admin to add users to their tenant"""
    email: EmailStr
    password: str
    full_name: str
    role: str = "USER" # USER, EDITOR, ADMIN

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str]
    role: str
    tenant_id: Optional[UUID]
    is_active: bool
    
    class Config:
        from_attributes = True

class TenantResponse(BaseModel):
    id: UUID
    name: str
    cnpj: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
