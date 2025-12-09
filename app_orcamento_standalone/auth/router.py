from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Tenant
from auth.schemas import UserRegister, UserCreateInternal, UserUpdate, Token, UserResponse, TenantResponse, ForgotPasswordRequest, ResetPasswordRequest
from auth.security import get_password_hash, verify_password, create_access_token
from auth.dependencies import get_current_user
from datetime import timedelta
from typing import List
from uuid import UUID
from services.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Public Endpoints ---

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # 1. Check if tenant exists (by CNPJ)
    result = await db.execute(select(Tenant).where(Tenant.cnpj == user_in.cnpj))
    existing_tenant = result.scalars().first()
    
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Tenant with this CNPJ already exists")

    # Check if user email exists globally (simplification)
    result_user = await db.execute(select(User).where(User.email == user_in.email))
    if result_user.scalars().first():
         raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create Tenant
    new_tenant = Tenant(name=user_in.tenant_name, cnpj=user_in.cnpj)
    db.add(new_tenant)
    await db.flush()
    
    # 3. Create User (Owner)
    hashed_password_val = get_password_hash(user_in.password)
    new_user = User(
        tenant_id=new_tenant.id,
        email=user_in.email,
        hashed_password=hashed_password_val,
        full_name=user_in.full_name,
        role="OWNER"
    )
    db.add(new_user)
    
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    return new_user

@router.post("/token", response_model=Token)
# @limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    users = result.scalars().all()
    
    if not users:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user = users[0] 
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive")

    access_token_expires = timedelta(minutes=120)
    access_token = create_access_token(
        data={"sub": user.email, "tenant_id": str(user.tenant_id), "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # Stub: In real world, generate token and send email
    return {"message": "If this email exists, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    # Stub: Verify token and update password
    return {"message": "Password reset successfully."}

# --- Protected Endpoints (User Management) ---

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = select(User).where(User.tenant_id == current_user.tenant_id).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/users", response_model=UserResponse)
async def create_user_internal(
    user_in: UserCreateInternal,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check uniqueness
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password_val = get_password_hash(user_in.password)
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=user_in.email,
        hashed_password=hashed_password_val,
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if target user belongs to tenant
    user = await db.get(User, user_id)
    if not user or user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user

# --- Super Admin Endpoints ---

@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Assuming there's a specific flag or role for Super Admin.
    # For now, we reuse OWNER role of a specific "System Tenant" or just assume logic for now.
    # Let's assume OWNER role can do this if they are in the "Primary" tenant.
    # TODO: Implement proper Super Admin check.
    if current_user.role != "OWNER":
        raise HTTPException(status_code=403, detail="Not authorized")

    query = select(Tenant).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
