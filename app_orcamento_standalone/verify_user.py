import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User
from auth.security import verify_password

async def verify_user():
    async with AsyncSessionLocal() as db:
        email = "admin@resolve.eng.br"
        print(f"Searching for user: {email}")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if user:
            print(f"User Found: ID={user.id}")
            print(f"Active: {user.is_active}")
            print(f"Tenant ID: {user.tenant_id}")
            print(f"Role: {user.role}")
            
            # Verify password
            is_valid = verify_password("admin123", user.hashed_password)
            print(f"Password 'admin123' valid: {is_valid}")
        else:
            print("User NOT found.")
            
            # Check if old user still exists
            result_old = await db.execute(select(User).where(User.email == "admin@propor.eng.br"))
            old_user = result_old.scalars().first()
            if old_user:
                 print("Old user 'admin@propor.eng.br' STILL EXISTS. Migration failed?")

if __name__ == "__main__":
    asyncio.run(verify_user())
