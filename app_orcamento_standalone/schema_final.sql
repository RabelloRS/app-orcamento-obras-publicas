-- ============================================================================
-- SCHEMA FINAL CONSOLIDADO - APP ORÇAMENTO
-- ============================================================================
-- Este arquivo contém TODA a estrutura do banco (schema + todas as migrações)
-- Use este arquivo ao reinicializar o banco de dados
-- ============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para busca fuzzy

-- ============================================================================
-- 1. MULTI-TENANCY & USERS
-- ============================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    logo_url VARCHAR(255),
    plan_tier VARCHAR(50) DEFAULT 'FREE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(200) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'USER',  -- OBSERVER, EDITOR, ADMIN, OWNER
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Organization
    tenant_id UUID REFERENCES tenants(id),
    team_id UUID REFERENCES teams(id)
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50),  -- IMPORT, UPDATE, DELETE
    target_type VARCHAR(50),  -- PRICE, BUDGET
    target_id VARCHAR(50),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE upload_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR(255),
    stored_path VARCHAR(255),
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),  -- SHA256
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20)  -- PENDING, PROCESSED, ERROR
);

-- ============================================================================
-- 2. REFERENCE DATA (Shared - SINAPI, SICRO)
-- ============================================================================

CREATE TABLE reference_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,  -- SINAPI, SICRO, ORSE
    description VARCHAR(255),
    state VARCHAR(2) DEFAULT 'BR',
    month INTEGER DEFAULT 1,
    year INTEGER DEFAULT 2024,
    type VARCHAR(20) DEFAULT 'SYNTHETIC'
);

CREATE TABLE reference_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id INTEGER REFERENCES reference_sources(id),
    code VARCHAR(20),
    description TEXT NOT NULL,
    unit VARCHAR(10) NOT NULL,
    type VARCHAR(20),  -- MATERIAL, LABOR, COMPOSITION, EQUIPMENT
    
    -- SICRO specifics
    methodology VARCHAR(20) DEFAULT 'UNITARY',  -- UNITARY or PRODUCTION
    
    -- REGRA MAGNA: Imutabilidade
    is_official BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para reference_items
CREATE INDEX IF NOT EXISTS idx_ref_items_code ON reference_items(code);
CREATE INDEX IF NOT EXISTS idx_ref_items_desc_trgm ON reference_items USING gin(description gin_trgm_ops);

CREATE TABLE reference_prices (
    id SERIAL PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES reference_items(id),
    region VARCHAR(50),
    price DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    date_validity DATE,
    charge_type VARCHAR(20) DEFAULT 'DESONERADO',  -- DESONERADO, NAO_DESONERADO
    
    -- Soft delete
    is_active BOOLEAN DEFAULT TRUE,
    inactivated_at TIMESTAMP,
    inactivated_by_id UUID REFERENCES users(id)
);

-- Índices para reference_prices
CREATE INDEX IF NOT EXISTS idx_ref_prices_lookup ON reference_prices(item_id, region, date_validity DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ref_prices_date ON reference_prices(date_validity DESC);
CREATE INDEX IF NOT EXISTS idx_ref_price_charge_type ON reference_prices(charge_type);

-- ============================================================================
-- 3. SICRO SPECIFICS
-- ============================================================================

CREATE TABLE sicro_teams (
    id SERIAL PRIMARY KEY,
    composition_item_id UUID REFERENCES reference_items(id),
    member_item_id UUID REFERENCES reference_items(id),
    quantity DECIMAL(10, 4)
);

CREATE TABLE sicro_production_rates (
    id SERIAL PRIMARY KEY,
    item_id UUID REFERENCES reference_items(id),
    production_hourly DECIMAL(10, 4),
    unit VARCHAR(10)
);

CREATE TABLE composition_items (
    id SERIAL PRIMARY KEY,
    parent_item_id UUID REFERENCES reference_items(id),
    child_item_id UUID REFERENCES reference_items(id),
    coefficient DECIMAL(10, 6),
    price_source DECIMAL(15, 2)
);

-- Índices para composition_items
CREATE INDEX IF NOT EXISTS idx_comp_items_parent ON composition_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_comp_items_child ON composition_items(child_item_id);

-- ============================================================================
-- 4. CUSTOM COMPOSITIONS (User Editable - "Próprias")
-- ============================================================================

CREATE TABLE custom_compositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    original_item_id UUID REFERENCES reference_items(id),
    code VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    type VARCHAR(20) DEFAULT 'COMPOSITION',
    source_name VARCHAR(50) DEFAULT 'PRÓPRIA',
    unit_price DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP
);

-- Índices para custom_compositions
CREATE INDEX IF NOT EXISTS idx_custom_compositions_code ON custom_compositions(code);
CREATE INDEX IF NOT EXISTS idx_custom_compositions_tenant ON custom_compositions(tenant_id);

CREATE TABLE custom_composition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    composition_id UUID NOT NULL REFERENCES custom_compositions(id) ON DELETE CASCADE,
    reference_item_id UUID REFERENCES reference_items(id),
    custom_code VARCHAR(30),
    custom_description TEXT,
    unit VARCHAR(20) NOT NULL,
    coefficient DECIMAL(15, 6) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL
);

-- Índices para custom_composition_items
CREATE INDEX IF NOT EXISTS idx_custom_composition_items_composition ON custom_composition_items(composition_id);

-- ============================================================================
-- 5. PROJECTS & BUDGETS
-- ============================================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete
    deleted_at TIMESTAMP,
    deleted_by_id UUID REFERENCES users(id),
    deleted_reason TEXT,
    restored_at TIMESTAMP,
    restored_by_id UUID REFERENCES users(id),
    
    -- Ownership
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_by_id UUID NOT NULL REFERENCES users(id)
);

-- Índices para projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted ON projects(tenant_id, deleted_at);

CREATE TABLE project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    reference_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    total_value DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete
    deleted_at TIMESTAMP,
    deleted_by_id UUID REFERENCES users(id),
    deleted_reason TEXT,
    restored_at TIMESTAMP,
    restored_by_id UUID REFERENCES users(id),
    
    -- BDI & Social charges
    social_charges_type VARCHAR(20) DEFAULT 'DESONERADO'
);

-- Índices para project_budgets
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON project_budgets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_budgets_project_deleted ON project_budgets(project_id, deleted_at);

CREATE TABLE bdi_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID UNIQUE NOT NULL REFERENCES project_budgets(id),
    
    -- BDI rates
    administration_rate DECIMAL(5, 4) DEFAULT 0.0300,
    financial_expenses_rate DECIMAL(5, 4) DEFAULT 0.0059,
    insurance_rate DECIMAL(5, 4) DEFAULT 0.0080,
    risk_rate DECIMAL(5, 4) DEFAULT 0.0127,
    profit_rate DECIMAL(5, 4) DEFAULT 0.0740,
    
    -- Tax rates
    pis_rate DECIMAL(5, 4) DEFAULT 0.0065,
    cofins_rate DECIMAL(5, 4) DEFAULT 0.0300,
    iss_rate DECIMAL(5, 4) DEFAULT 0.0500,
    cprb_rate DECIMAL(5, 4) DEFAULT 0.0450,
    
    -- Calculated totals
    total_bdi_services DECIMAL(5, 4),
    total_bdi_materials DECIMAL(5, 4),
    total_bdi_equipment DECIMAL(5, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Índices para bdi_configurations
CREATE INDEX IF NOT EXISTS idx_bdi_config_budget ON bdi_configurations(budget_id);

CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
    
    -- Link to source or custom
    reference_item_id UUID REFERENCES reference_items(id),
    custom_code VARCHAR(20),
    custom_description TEXT,
    
    quantity DECIMAL(10, 4) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    bdi_applied DECIMAL(5, 2) DEFAULT 0,
    
    -- WBS / Hierarchy
    parent_id UUID REFERENCES budget_items(id),
    numbering VARCHAR(50) DEFAULT '',
    item_type VARCHAR(20) DEFAULT 'ITEM',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. SCHEDULES & MEASUREMENTS
-- ============================================================================

CREATE TABLE physical_financial_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_item_id UUID NOT NULL REFERENCES budget_items(id),
    period DATE NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    value_predicted DECIMAL(15, 2) NOT NULL
);

CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_item_id UUID NOT NULL REFERENCES budget_items(id),
    measurement_date DATE NOT NULL,
    quantity_measured DECIMAL(10, 4) NOT NULL,
    value_measured DECIMAL(15, 2) NOT NULL,
    milestone_name VARCHAR(100)
);

-- ============================================================================
-- 7. MEMORIALS (Technical Documents)
-- ============================================================================

CREATE TABLE memorials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source_document VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_memorials (
    item_id UUID REFERENCES reference_items(id),
    memorial_id UUID REFERENCES memorials(id),
    relevance_score INTEGER DEFAULT 1,
    PRIMARY KEY (item_id, memorial_id)
);

-- ============================================================================
-- 8. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Função: Prevenir edição de dados oficiais (REGRA MAGNA)
CREATE OR REPLACE FUNCTION prevent_official_data_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE REGRA MAGNA: Dados de bases oficiais (SINAPI/SICRO) são IMUTÁVEIS e não podem ser editados. Crie uma composição própria se precisar alterar.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_reference_items ON reference_items;
CREATE TRIGGER protect_reference_items
BEFORE UPDATE ON reference_items
FOR EACH ROW EXECUTE FUNCTION prevent_official_data_edit();

-- Função: Prevenir deleção de preços bloqueados
CREATE OR REPLACE FUNCTION prevent_locked_price_delete()
RETURNS TRIGGER AS $$
DECLARE
    item_locked BOOLEAN;
BEGIN
    SELECT is_locked INTO item_locked FROM reference_items WHERE id = OLD.item_id;
    IF item_locked = TRUE AND OLD.is_active = TRUE THEN
        RAISE EXCEPTION 'VIOLAÇÃO: Preços de itens oficiais não podem ser deletados.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_reference_prices ON reference_prices;
CREATE TRIGGER protect_reference_prices
BEFORE DELETE ON reference_prices
FOR EACH ROW EXECUTE FUNCTION prevent_locked_price_delete();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) - Multi-tenant isolation
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_projects ON projects
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

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

ALTER TABLE custom_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_custom_compositions ON custom_compositions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

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

-- ============================================================================
-- 10. INDEXES & PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ref_items_source_type 
    ON reference_items(source_id, type);

CREATE INDEX IF NOT EXISTS idx_ref_items_locked 
    ON reference_items(is_locked) 
    WHERE is_locked = FALSE;

CREATE INDEX IF NOT EXISTS idx_custom_comp_tenant 
    ON custom_compositions(tenant_id, code);

-- Atualizar estatísticas
ANALYZE reference_items;
ANALYZE reference_prices;
ANALYZE composition_items;
ANALYZE projects;
ANALYZE project_budgets;
ANALYZE budget_items;

-- ============================================================================
-- FIM DO SCHEMA FINAL
-- ============================================================================
