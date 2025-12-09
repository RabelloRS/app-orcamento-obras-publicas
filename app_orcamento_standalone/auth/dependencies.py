from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from settings import get_settings
from database import get_db
from models import User
from auth.schemas import TokenData

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            tenant_id: str = payload.get("tenant_id")
            if email is None or tenant_id is None:
                raise credentials_exception
            token_data = TokenData(email=email, tenant_id=tenant_id)
        except JWTError:
            raise credentials_exception
            
        # Fetch user from DB to ensure they still exist and are active
        # Handle string UUID for SQLite/Test compatibility where implicit casting might fail or be strict
        import uuid
        tenant_uuid = uuid.UUID(token_data.tenant_id)
        result = await db.execute(select(User).where(User.email == token_data.email, User.tenant_id == tenant_uuid))
        user = result.scalars().first()
        
        if user is None:
            raise credentials_exception
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        return user
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e
