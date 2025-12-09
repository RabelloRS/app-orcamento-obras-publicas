-- Migration 006: Trash metadata and cascade deletes
-- Objetivo: adicionar metadados de lixeira e permitir hard delete seguro via cascata

-- 1) Metadados de lixeira em projects
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
    ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS restored_by_id UUID REFERENCES users(id);

-- 2) Metadados de lixeira em project_budgets
ALTER TABLE project_budgets
    ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
    ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS restored_by_id UUID REFERENCES users(id);

-- 3) Índices auxiliares para consultas de lixeira
CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted ON projects(tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_budgets_project_deleted ON project_budgets(project_id, deleted_at);

-- 4) Ajustar FK project_budgets.project_id para ON DELETE CASCADE
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

-- 5) Ajustar FK budget_items.budget_id para ON DELETE CASCADE
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
