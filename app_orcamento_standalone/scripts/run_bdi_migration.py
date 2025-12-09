import asyncio
from sqlalchemy import text
from database import engine

async def run_bdi_migration():
    print("Iniciando migração: BDI Tables")
    async with engine.begin() as conn:
        try:
            with open("migrations/003_bdi_social_charges.sql", "r") as f:
                sql = f.read()
            
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            
            for stmt in statements:
                print(f"Executando: {stmt[:50]}...")
                await conn.execute(text(stmt))
            
            print("   ✓ Tabelas criadas com sucesso")
        except Exception as e:
            print(f"   ⚠ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(run_bdi_migration())
