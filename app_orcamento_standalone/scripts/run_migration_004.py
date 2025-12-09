import asyncio
from sqlalchemy import text
from database import engine

async def run_migration_004():
    print("Iniciando migração 004: Reference Price Types")
    async with engine.begin() as conn:
        try:
            with open("migrations/004_reference_price_types.sql", "r") as f:
                sql = f.read()
            
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            for stmt in statements:
                print(f"Executando: {stmt[:50]}...")
                await conn.execute(text(stmt))
                
            print("   ✓ Colunas adicionadas")
        except Exception as e:
            print(f"   ⚠ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration_004())
