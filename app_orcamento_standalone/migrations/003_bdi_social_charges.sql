ALTER TABLE project_budgets ADD COLUMN IF NOT EXISTS social_charges_type VARCHAR(20) DEFAULT 'DESONERADO';

CREATE TABLE IF NOT EXISTS bdi_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID UNIQUE NOT NULL REFERENCES project_budgets(id),
    
    administration_rate DECIMAL(5, 4) DEFAULT 0.0300,
    financial_expenses_rate DECIMAL(5, 4) DEFAULT 0.0059,
    insurance_rate DECIMAL(5, 4) DEFAULT 0.0080,
    risk_rate DECIMAL(5, 4) DEFAULT 0.0127,
    profit_rate DECIMAL(5, 4) DEFAULT 0.0740,
    
    pis_rate DECIMAL(5, 4) DEFAULT 0.0065,
    cofins_rate DECIMAL(5, 4) DEFAULT 0.0300,
    iss_rate DECIMAL(5, 4) DEFAULT 0.0500,
    cprb_rate DECIMAL(5, 4) DEFAULT 0.0450,
    
    total_bdi_services DECIMAL(5, 4),
    total_bdi_materials DECIMAL(5, 4),
    total_bdi_equipment DECIMAL(5, 4),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bdi_config_budget ON bdi_configurations(budget_id);
