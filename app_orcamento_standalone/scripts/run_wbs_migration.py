import asyncio
from sqlalchemy import text
from database import engine

async def run_wbs_migration():
    print("Iniciando migração: WBS Hierarchy")
    async with engine.begin() as conn:
        try:
            with open("migrations/002_wbs_hierarchy.sql", "r") as f:
                sql = f.read()
            
            # Split by line or execute whole block if supported. 
            # Simple approach: execute line by line or split by semicolon if needed.
            # Here given the file content, executing essentially statement by statement.
            statements = [s.strip() for s in sql.split(';') if s.strip()]
            
            for stmt in statements:
                print(f"Executando: {stmt[:50]}...")
                await conn.execute(text(stmt))
            
            print("   ✓ Colunas adicionadas com sucesso")
        except Exception as e:
            print(f"   ⚠ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(run_wbs_migration())
