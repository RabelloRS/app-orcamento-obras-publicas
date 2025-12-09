"""
Script para executar a migração de imutabilidade de dados
Executa as instruções SQL do arquivo migrations/001_data_immutability.sql
"""

import asyncio
from sqlalchemy import text
from database import engine

async def run_migration():
    print("Iniciando migração: Data Immutability Rules")
    
    async with engine.begin() as conn:
        # 1. Adicionar colunas de imutabilidade
        print("1. Adicionando colunas is_official e is_locked...")
        try:
            await conn.execute(text("""
                ALTER TABLE reference_items 
                ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT TRUE
            """))
            await conn.execute(text("""
                ALTER TABLE reference_items 
                ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT TRUE
            """))
            print("   ✓ Colunas adicionadas")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 2. Atualizar itens existentes
        print("2. Marcando itens existentes como oficiais e bloqueados...")
        try:
            await conn.execute(text("""
                UPDATE reference_items 
                SET is_official = TRUE, is_locked = TRUE 
                WHERE is_official IS NULL OR is_locked IS NULL
            """))
            print("   ✓ Itens atualizados")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 3. Criar tabela custom_compositions
        print("3. Criando tabela custom_compositions...")
        try:
            await conn.execute(text("""
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
                )
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_custom_compositions_code 
                ON custom_compositions(code)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_custom_compositions_tenant 
                ON custom_compositions(tenant_id)
            """))
            print("   ✓ Tabela custom_compositions criada")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 4. Criar tabela custom_composition_items
        print("4. Criando tabela custom_composition_items...")
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS custom_composition_items (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    composition_id UUID NOT NULL REFERENCES custom_compositions(id) ON DELETE CASCADE,
                    reference_item_id UUID REFERENCES reference_items(id),
                    custom_code VARCHAR(30),
                    custom_description TEXT,
                    unit VARCHAR(20) NOT NULL,
                    coefficient DECIMAL(15, 6) NOT NULL,
                    unit_price DECIMAL(15, 2) NOT NULL
                )
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_custom_composition_items_composition 
                ON custom_composition_items(composition_id)
            """))
            print("   ✓ Tabela custom_composition_items criada")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 5. Criar trigger de proteção
        print("5. Criando trigger de proteção...")
        try:
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION prevent_official_data_edit()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF OLD.is_locked = TRUE THEN
                        RAISE EXCEPTION 'VIOLAÇÃO DE REGRA MAGNA: Dados de bases oficiais são IMUTÁVEIS.';
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
            """))
            
            await conn.execute(text("""
                DROP TRIGGER IF EXISTS protect_reference_items ON reference_items
            """))
            
            await conn.execute(text("""
                CREATE TRIGGER protect_reference_items
                BEFORE UPDATE ON reference_items
                FOR EACH ROW EXECUTE FUNCTION prevent_official_data_edit()
            """))
            print("   ✓ Trigger de proteção criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
    
    print("\n✅ Migração concluída!")

if __name__ == "__main__":
    asyncio.run(run_migration())
