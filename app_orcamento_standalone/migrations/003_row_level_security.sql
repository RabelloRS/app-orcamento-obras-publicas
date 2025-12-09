-- Migration 003: Row Level Security (RLS) Policies
-- Descrição: Adiciona políticas de segurança a nível de linha para isolamento multi-tenant
-- Data: 2024-12-07
--
-- IMPORTANTE: RLS é uma camada ADICIONAL de segurança.
-- A aplicação já filtra por tenant_id, mas RLS garante proteção mesmo se
-- houver bugs ou SQL injection.

-- ============================================
-- HABILITAR RLS NAS TABELAS DE DADOS DO TENANT
-- ============================================

-- 1. Projects - dados de projetos isolados por empresa
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 2. Project Budgets - isolados através do project
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_budgets ON project_budgets
    FOR ALL
    USING (project_id IN (
        SELECT id FROM projects 
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ))
    WITH CHECK (project_id IN (
        SELECT id FROM projects 
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ));

-- 3. Budget Items - isolados através do budget -> project
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_budget_items ON budget_items
    FOR ALL
    USING (budget_id IN (
        SELECT pb.id FROM project_budgets pb
        JOIN projects p ON pb.project_id = p.id
        WHERE p.tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ))
    WITH CHECK (budget_id IN (
        SELECT pb.id FROM project_budgets pb
        JOIN projects p ON pb.project_id = p.id
        WHERE p.tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ));

-- 4. Custom Compositions - composições próprias isoladas por empresa
ALTER TABLE custom_compositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_custom_compositions ON custom_compositions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- 5. Custom Composition Items
ALTER TABLE custom_composition_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_custom_comp_items ON custom_composition_items
    FOR ALL
    USING (composition_id IN (
        SELECT id FROM custom_compositions 
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ))
    WITH CHECK (composition_id IN (
        SELECT id FROM custom_compositions 
        WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
    ));

-- 6. Users - isolados por empresa (exceto super admin)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::UUID
        OR current_setting('app.is_super_admin', true)::BOOLEAN = true
    )
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id', true)::UUID
        OR current_setting('app.is_super_admin', true)::BOOLEAN = true
    );

-- ============================================
-- DADOS PÚBLICOS (SEM RLS)
-- ============================================
-- As seguintes tabelas são PÚBLICAS (compartilhadas entre empresas):
-- - reference_sources (SINAPI, SICRO)
-- - reference_items (composições oficiais)
-- - reference_prices (preços oficiais)
-- - composition_items (estrutura de composições)
-- - memorials (documentos técnicos)

-- ============================================
-- BYPASS PARA SUPER ADMIN
-- ============================================
-- Criar role para bypass de RLS (operações administrativas)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_bypass') THEN
--         CREATE ROLE admin_bypass NOLOGIN;
--     END IF;
-- END
-- $$;

-- Dar permissão de bypass aos superadmins
-- ALTER TABLE projects OWNER TO admin_bypass;

-- ============================================
-- NOTA DE IMPLEMENTAÇÃO
-- ============================================
-- Para usar RLS, a aplicação deve setar o tenant_id antes de cada query:
--
-- async with db.begin():
--     await db.execute(text("SET LOCAL app.current_tenant_id = :tid"), {"tid": str(user.tenant_id)})
--     # ... queries aqui serão filtradas automaticamente
--

DO $$
BEGIN
    RAISE NOTICE 'Migration 003 completed: RLS policies created for multi-tenant isolation.';
END $$;
