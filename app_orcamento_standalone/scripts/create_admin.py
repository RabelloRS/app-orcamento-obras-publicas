import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal


from models import User, Tenant
from auth.security import get_password_hash

async def create_admin():
    async with AsyncSessionLocal() as db:


        print("Checking for existing tenant/user...")
        
        # 1. Create Tenant if not exists
        result = await db.execute(select(Tenant).where(Tenant.cnpj == "00000000000000"))
        tenant = result.scalars().first()
        
        if not tenant:
            print("Creating default tenant...")
            tenant = Tenant(name="Resolve Engenharia", cnpj="00000000000000", plan_tier="ENTERPRISE")
            db.add(tenant)
            await db.commit()
            await db.refresh(tenant)
        else:
            print("Tenant already exists.")

        # 2. Create Admin User
        result_user = await db.execute(select(User).where(User.email == "admin@propor.eng.br"))
        user = result_user.scalars().first()
        
        if not user:
            print("Creating admin user...")
            new_user = User(
                tenant_id=tenant.id,
                email="admin@propor.eng.br",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador do Sistema",
                role="OWNER",
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print("Admin user created successfully!")
            print("Email: admin@propor.eng.br")
            print("Password: admin123")
        else:
            print("Admin user already exists. Resetting password to 'admin123'...")
            user.hashed_password = get_password_hash("admin123")
            user.is_active = True
            await db.commit()
            print("Password reset to 'admin123'.")


if __name__ == "__main__":
    asyncio.run(create_admin())
