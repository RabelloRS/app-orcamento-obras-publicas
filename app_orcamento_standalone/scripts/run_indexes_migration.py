"""
Script para executar a migração de índices de performance
Executa as instruções SQL do arquivo migrations/002_performance_indexes.sql
"""

import asyncio
from sqlalchemy import text
from database import engine

async def run_migration():
    print("Iniciando migração: Performance Indexes")
    
    async with engine.begin() as conn:
        # 1. Habilitar pg_trgm
        print("1. Habilitando extensão pg_trgm...")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            print("   ✓ pg_trgm habilitado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 2. Índice trigram
        print("2. Criando índice trigram para descrição...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ref_items_desc_trgm 
                ON reference_items USING gin(description gin_trgm_ops)
            """))
            print("   ✓ Índice trigram criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 3. Índice de preços
        print("3. Criando índice composto para preços...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ref_prices_lookup 
                ON reference_prices(item_id, region, date_validity DESC)
            """))
            print("   ✓ Índice de preços criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 4. Índice de data
        print("4. Criando índice de data de validade...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ref_prices_date 
                ON reference_prices(date_validity DESC)
            """))
            print("   ✓ Índice de data criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 5. Índice de composições (parent)
        print("5. Criando índice para composições (parent)...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comp_items_parent 
                ON composition_items(parent_item_id)
            """))
            print("   ✓ Índice de composições (parent) criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 6. Índice de composições (child)
        print("6. Criando índice para composições (child)...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comp_items_child 
                ON composition_items(child_item_id)
            """))
            print("   ✓ Índice de composições (child) criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 7. Índice source+type
        print("7. Criando índice composto source+type...")
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ref_items_source_type 
                ON reference_items(source_id, type)
            """))
            print("   ✓ Índice source+type criado")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
        
        # 8. Analisar estatísticas
        print("8. Atualizando estatísticas do banco...")
        try:
            await conn.execute(text("ANALYZE reference_items"))
            await conn.execute(text("ANALYZE reference_prices"))
            print("   ✓ Estatísticas atualizadas")
        except Exception as e:
            print(f"   ⚠ Aviso: {e}")
    
    print("\n✅ Migração de índices concluída!")
    print("   Isso deve melhorar significativamente a velocidade de pesquisa.")

if __name__ == "__main__":
    asyncio.run(run_migration())
