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

    engine = create_async_engine(DATABASE_URL)

    print("Applying migration 006_trash_and_cascade.sql...")

    statements = [
        # 1) Metadados de lixeira em projects
        """
        ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
            ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS restored_by_id UUID REFERENCES users(id);
        """,
        # 2) Metadados de lixeira em project_budgets
        """
        ALTER TABLE project_budgets
            ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
            ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS restored_by_id UUID REFERENCES users(id);
        """,
        # 3) Índices
        """CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted ON projects(tenant_id, deleted_at);""",
        """CREATE INDEX IF NOT EXISTS idx_budgets_project_deleted ON project_budgets(project_id, deleted_at);""",
        # 4) Ajustar FK project_budgets.project_id
        """
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'project_budgets'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'project_id'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE project_budgets DROP CONSTRAINT %I', constraint_name);
            END IF;

            EXECUTE 'ALTER TABLE project_budgets
                     ADD CONSTRAINT project_budgets_project_id_fkey
                     FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE';
        END$$;
        """,
        # 5) Ajustar FK budget_items.budget_id
        """
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'budget_items'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'budget_id'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE budget_items DROP CONSTRAINT %I', constraint_name);
            END IF;

            EXECUTE 'ALTER TABLE budget_items
                     ADD CONSTRAINT budget_items_budget_id_fkey
                     FOREIGN KEY (budget_id) REFERENCES project_budgets(id) ON DELETE CASCADE';
        END$$;
        """,
    ]

    async with engine.begin() as conn:
        for stmt in statements:
            preview = stmt.strip().replace('\n', ' ')
            print(f"Executing: {preview[:80]}...")
            await conn.execute(text(stmt))

    print("Migration applied successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_migration())
