import asyncio
import asyncpg
from pathlib import Path
from settings import get_settings

async def init_db():
    settings = get_settings()
    # Parse the DATABASE_URL to get params
    # URL format: postgresql+asyncpg://user:password@host:port/dbname
    # We need to connect to 'postgres' db first to create the new db
    
    # Simple parsing (robust enough for default settings)
    url = settings.DATABASE_URL
    user_pass, host_port_db = url.split("://")[1].split("@")
    user, password = user_pass.split(":")
    host_port, dbname = host_port_db.split("/")
    host, port = host_port.split(":")
    
    print(f"Connecting to PostgreSQL as {user} on {host}:{port}...")
    
    try:
        # 1. Connect to 'postgres' database to create the target database
        sys_conn = await asyncpg.connect(
            user=user,
            password=password,
            database='postgres',
            host=host,
            port=port
        )
        
        # Check if database exists
        exists = await sys_conn.fetchval(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        if exists:
            print(f"Database '{dbname}' already exists. SKIPPING recreation to preserve data.")
            print("Run with --force (not implemented yet) if you really want to drop it.")
            # Do not drop, do not create.
        else:
            print(f"Creating database '{dbname}'...")
            await sys_conn.execute(f'CREATE DATABASE "{dbname}"')
            
        await sys_conn.close()
        
        # 2. Connect to the new database and run schema
        print(f"Conectando a '{dbname}' para aplicar schema...")
        conn = await asyncpg.connect(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
        
        # Usar schema_final.sql que já contém todas as migrações
        schema_file = "schema_final.sql"
        if not Path(schema_file).exists():
            print(f"⚠️  {schema_file} não encontrado, tentando schema.sql...")
            schema_file = "schema.sql"
        
        with open(schema_file, "r", encoding="utf-8") as f:
            schema = f.read()
            
        # Split by commands if needed, or execute block if simple
        # asyncpg executes multiple statements if separated by semicolon? 
        # Actually asyncpg.execute might handle it, or we might need to split.
        # schema.sql contains 'COPY' or specific commands?
        # It has CREATE EXTENSION, CREATE TABLE, etc.
        # Let's try executing the whole block.
        
        await conn.execute(schema)
        print("Schema applied successfully.")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(init_db())
