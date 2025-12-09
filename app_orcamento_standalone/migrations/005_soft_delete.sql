-- Add deleted_at column to projects and project_budgets
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON project_budgets(deleted_at);
