import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

DDL = [
    """
    CREATE TABLE IF NOT EXISTS composition_items (
        id SERIAL PRIMARY KEY,
        parent_item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
        child_item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
        coefficient NUMERIC(10, 6) NOT NULL,
        price_source NUMERIC(15, 2)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_composition_items_parent ON composition_items(parent_item_id);",
    "CREATE INDEX IF NOT EXISTS idx_composition_items_child ON composition_items(child_item_id);",
]

async def apply_migration():
    if not DATABASE_URL:
        print("DATABASE_URL not found in environment.")
        return

    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for stmt in DDL:
            preview = stmt.strip().replace("\n", " ")
            print(f"Executing: {preview[:80]}...")
            await conn.execute(text(stmt))

    await engine.dispose()
    print("Migration 007 applied (composition_items created/ensured).")

if __name__ == "__main__":
    asyncio.run(apply_migration())
