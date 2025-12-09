-- Migration: Add Data Immutability Rules and Custom Compositions
-- Date: 2024-12-07
-- Description: Implements REGRA MAGNA for official data protection

-- 1. Add immutability columns to reference_items
ALTER TABLE reference_items 
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT TRUE;

ALTER TABLE reference_items 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT TRUE;

-- Set all existing items as official and locked (they come from SINAPI/SICRO)
UPDATE reference_items SET is_official = TRUE, is_locked = TRUE WHERE is_official IS NULL;

-- 2. Create custom_compositions table
CREATE TABLE IF NOT EXISTS custom_compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    original_item_id UUID REFERENCES reference_items(id),
    code VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    type VARCHAR(20) DEFAULT 'COMPOSITION',
    source_name VARCHAR(50) DEFAULT 'PRÓPRIA',
    unit_price DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by_id UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_compositions_code ON custom_compositions(code);
CREATE INDEX IF NOT EXISTS idx_custom_compositions_tenant ON custom_compositions(tenant_id);

-- 3. Create custom_composition_items table
CREATE TABLE IF NOT EXISTS custom_composition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composition_id UUID NOT NULL REFERENCES custom_compositions(id) ON DELETE CASCADE,
    reference_item_id UUID REFERENCES reference_items(id),
    custom_code VARCHAR(30),
    custom_description TEXT,
    unit VARCHAR(20) NOT NULL,
    coefficient DECIMAL(15, 6) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_composition_items_composition ON custom_composition_items(composition_id);

-- 4. Create trigger to protect official data (PostgreSQL)
CREATE OR REPLACE FUNCTION prevent_official_data_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE REGRA MAGNA: Dados de bases oficiais (SINAPI/SICRO) são IMUTÁVEIS e não podem ser editados. Crie uma composição própria se precisar alterar.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger only on UPDATE (not DELETE, as we may need to delete during re-imports)
DROP TRIGGER IF EXISTS protect_reference_items ON reference_items;
CREATE TRIGGER protect_reference_items
BEFORE UPDATE ON reference_items
FOR EACH ROW EXECUTE FUNCTION prevent_official_data_edit();

-- 5. Create trigger to prevent deletion of locked prices
CREATE OR REPLACE FUNCTION prevent_locked_price_delete()
RETURNS TRIGGER AS $$
DECLARE
    item_locked BOOLEAN;
BEGIN
    SELECT is_locked INTO item_locked FROM reference_items WHERE id = OLD.item_id;
    IF item_locked = TRUE AND OLD.is_active = TRUE THEN
        -- Allow soft delete (is_active = FALSE) but not hard delete
        RAISE EXCEPTION 'VIOLAÇÃO: Preços de itens oficiais não podem ser deletados.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_reference_prices ON reference_prices;
CREATE TRIGGER protect_reference_prices
BEFORE DELETE ON reference_prices
FOR EACH ROW EXECUTE FUNCTION prevent_locked_price_delete();

-- Message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Data Immutability Rules implemented.';
END $$;
