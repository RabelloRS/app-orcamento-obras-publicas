import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def apply_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found in environment.")
        return

    # Create async engine
    engine = create_async_engine(DATABASE_URL)

    with open("migrations/005_soft_delete.sql", "r") as f:
        sql = f.read()

    print("Applying migration 005_soft_delete.sql...")
    
    async with engine.begin() as conn:
        statements = sql.split(';')
        for statement in statements:
            if statement.strip():
                print(f"Executing: {statement.strip()[:50]}...")
                await conn.execute(text(statement))
    
    print("Migration applied successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_migration())
