import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

DDL = [
    """
    ALTER TABLE reference_prices
    ADD COLUMN IF NOT EXISTS charge_type VARCHAR(20) DEFAULT 'DESONERADO';
    """
]

async def apply_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found in environment.")
        return

    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for stmt in DDL:
            preview = stmt.strip().replace('\n',' ')
            print(f"Executing: {preview[:80]}...")
            await conn.execute(text(stmt))

    await engine.dispose()
    print("Migration 011 applied (reference_prices.charge_type).")

if __name__ == "__main__":
    asyncio.run(apply_migration())
