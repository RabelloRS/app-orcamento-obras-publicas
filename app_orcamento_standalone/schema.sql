-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANTS & USERS (Multi-tenancy Core)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    logo_url VARCHAR(255),

    plan_tier VARCHAR(50) DEFAULT 'FREE', -- FREE, PRO, ENTERPRISE
    is_active BOOLEAN DEFAULT TRUE,


    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    email VARCHAR(255) NOT NULL,

    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'ENGINEER', 'VIEWER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email) -- Email unique per tenant
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL, -- e.g., 'projects', 'budget', 'users'
    action VARCHAR(50) NOT NULL, -- 'READ', 'WRITE', 'DELETE'
    UNIQUE(role, resource, action)
);

-- 2. REFERENCE DATA (Shared Public Data - SINAPI, SICRO, etc.)
CREATE TABLE reference_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- SINAPI, SICRO, CDHU
    state VARCHAR(2) NOT NULL, -- SP, RJ, BR
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- SYNTHETIC, ANALYTIC
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, state, month, year, type)
);

CREATE TABLE reference_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id INTEGER REFERENCES reference_sources(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- e.g., "73922/001"
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('MATERIAL', 'LABOR', 'EQUIPMENT', 'COMPOSITION', 'SERVICE')),
    technical_spec_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Index for fast search on code and description
CREATE INDEX idx_ref_items_code ON reference_items(code);
CREATE INDEX idx_ref_items_desc ON reference_items USING gin(to_tsvector('portuguese', description));

CREATE TABLE reference_prices (
    id BIGSERIAL PRIMARY KEY,
    item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
    region VARCHAR(50), -- Some sources have regional prices
    price DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    date_validity DATE
);

CREATE TABLE compositions (
    id BIGSERIAL PRIMARY KEY,
    parent_item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
    child_item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
    coefficient DECIMAL(15, 6) NOT NULL, -- Quantity of child needed for 1 unit of parent
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. TECHNICAL DOCUMENTS (Memorials)
CREATE TABLE memorials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- HTML or Markdown content
    source_document VARCHAR(255), -- e.g., "Caderno Técnico Alvenaria"
    -- embedding_vector VECTOR(1536), -- Placeholder for pgvector (OpenAI embeddings)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_memorials (
    item_id UUID REFERENCES reference_items(id) ON DELETE CASCADE,
    memorial_id UUID REFERENCES memorials(id) ON DELETE CASCADE,
    relevance_score FLOAT DEFAULT 1.0,
    PRIMARY KEY (item_id, memorial_id)
);

-- 4. PROJECT DATA (Tenant Specific)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    bdi_percent DECIMAL(5, 2) DEFAULT 0.00,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Orçamento Base", "Revisão 1"
    reference_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, FINAL, APPROVED
    total_value DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID REFERENCES project_budgets(id) ON DELETE CASCADE,
    reference_item_id UUID REFERENCES reference_items(id), -- Nullable if custom item
    custom_code VARCHAR(50),
    custom_description TEXT,
    quantity DECIMAL(15, 4) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    bdi_applied DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS) Policies (Examples)
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_policy ON projects
--     USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
