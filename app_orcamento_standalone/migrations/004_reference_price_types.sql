ALTER TABLE reference_prices ADD COLUMN IF NOT EXISTS charge_type VARCHAR(20) DEFAULT 'DESONERADO';
CREATE INDEX IF NOT EXISTS idx_ref_price_charge_type ON reference_prices(charge_type);
