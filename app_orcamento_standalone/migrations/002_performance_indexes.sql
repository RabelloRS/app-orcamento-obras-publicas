-- Migration 002: Performance Indexes
-- Descrição: Adiciona índices críticos para performance de pesquisa
-- Data: 2024-12-07

-- 1. Habilitar extensão trigram para busca fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índice trigram para busca fuzzy rápida na descrição
-- Permite pesquisas como "argamassa" encontrar "ARGAMASSA DE CIMENTO"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ref_items_desc_trgm 
ON reference_items USING gin(description gin_trgm_ops);

-- 3. Índice composto para preços (busca por item + região + data)
-- Otimiza: SELECT * FROM reference_prices WHERE item_id = X AND region = 'RS' AND is_active = TRUE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ref_prices_lookup 
ON reference_prices(item_id, region, date_validity DESC) 
WHERE is_active = TRUE;

-- 4. Índice para busca de preços por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ref_prices_date 
ON reference_prices(date_validity DESC);

-- 5. Índice para composições - busca por item pai
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comp_items_parent 
ON composition_items(parent_item_id);

-- 6. Índice para composições - busca por item filho
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comp_items_child 
ON composition_items(child_item_id);

-- 7. Índice composto para items - source + type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ref_items_source_type 
ON reference_items(source_id, type);

-- 8. Índice para items - busca por is_locked/is_official
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ref_items_locked 
ON reference_items(is_locked) 
WHERE is_locked = FALSE;

-- 9. Índice para custom_compositions por tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_comp_tenant 
ON custom_compositions(tenant_id, code);

-- 10. Atualizar estatísticas do banco
ANALYZE reference_items;
ANALYZE reference_prices;
ANALYZE composition_items;

-- Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Migration 002 completed: Performance indexes created.';
END $$;
