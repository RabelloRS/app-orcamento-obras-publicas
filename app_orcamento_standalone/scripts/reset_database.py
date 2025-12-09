#!/usr/bin/env python
"""
Script para resetar o banco de dados para o estado FINAL.
- Deleta o banco existente
- Cria novo banco
- Aplica schema_final.sql (com todas as migrações)
- Cria usuário admin padrão

Use este script quando quiser limpar tudo e começar do zero.
"""

import asyncio
import asyncpg
import sys
import re
from pathlib import Path

try:
    import asyncpg
except ImportError:
    print("❌ asyncpg não encontrado. Instale com: pip install asyncpg")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).parent.parent))

from settings import get_settings

def parse_db_url(db_url: str) -> dict:
    """Extrai credenciais da DATABASE_URL."""
    url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    match = re.match(r"postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", url)
    if match:
        return {
            "user": match.group(1),
            "password": match.group(2),
            "host": match.group(3),
            "port": int(match.group(4)),
            "database": match.group(5),
        }
    raise ValueError(f"Formato inválido de DATABASE_URL: {db_url}")

async def reset_database():
    """Reseta o banco de dados para o estado final."""
    settings = get_settings()
    db_config = parse_db_url(settings.DATABASE_URL)
    dbname = db_config["database"]
    
    print("\n" + "="*60)
    print("RESETAR BANCO DE DADOS")
    print("="*60)
    print(f"Banco: {db_config['host']}:{db_config['port']}/{dbname}")
    print("\n⚠️  AVISO: Todas as tabelas e dados serão DELETADOS!")
    
    # Confirmação
    confirm = input("\nDigite 'sim' para confirmar: ").strip().lower()
    if confirm != "sim":
        print("❌ Operação cancelada.")
        return 1
    
    conn = None
    try:
        # 1. Conectar ao postgres (DB de sistema)
        print("\n📌 Conectando ao PostgreSQL...")
        sys_config = {**db_config, "database": "postgres"}
        sys_conn = await asyncpg.connect(**sys_config)
        
        # 2. Terminar conexões ativas
        print(f"📌 Terminando conexões ativas no banco '{dbname}'...")
        try:
            await sys_conn.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{dbname}'
                AND pid <> pg_backend_pid()
            """)
        except:
            pass
        
        # 3. Deletar banco
        print(f"🗑️  Deletando banco '{dbname}'...")
        try:
            await sys_conn.execute(f'DROP DATABASE IF EXISTS "{dbname}"')
        except Exception as e:
            print(f"⚠️  Erro ao deletar: {e}")
        
        # 4. Criar novo banco
        print(f"✅ Criando novo banco '{dbname}'...")
        await sys_conn.execute(f'CREATE DATABASE "{dbname}"')
        
        await sys_conn.close()
        
        # 5. Conectar ao novo banco
        print(f"📌 Conectando ao novo banco...")
        conn = await asyncpg.connect(**db_config)
        
        # 6. Aplicar schema_final.sql
        print("📌 Aplicando schema final (com todas as migrações)...")
        schema_path = Path(__file__).parent.parent / "schema_final.sql"
        
        if not schema_path.exists():
            print(f"❌ Arquivo não encontrado: {schema_path}")
            return 1
        
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        
        # Remover comentários de linha
        lines = []
        in_dollar = False
        for line in schema_sql.split('\n'):
            if '$$' in line:
                if line.count('$$') % 2 == 1:
                    in_dollar = not in_dollar
                lines.append(line)
            elif in_dollar:
                lines.append(line)
            else:
                if '--' in line:
                    line = line[:line.index('--')]
                if line.strip():
                    lines.append(line)
        
        schema_sql = '\n'.join(lines)
        
        # Dividir e executar statements
        statements = []
        current = []
        in_dollar = False
        
        for char in schema_sql:
            current.append(char)
            if '$$' in ''.join(current[-2:]):
                in_dollar = not in_dollar
            if char == ';' and not in_dollar:
                stmt = ''.join(current).strip()
                if stmt and not stmt.startswith('--'):
                    statements.append(stmt)
                current = []
        
        for i, stmt in enumerate(statements, 1):
            if stmt:
                try:
                    await conn.execute(stmt)
                except asyncpg.exceptions.PostgresError as e:
                    error_msg = str(e).lower()
                    if "already exists" not in error_msg and "já existe" not in error_msg:
                        print(f"⚠️  Statement {i}: {str(e)[:80]}")
        
        print(f"✅ Schema aplicado ({len(statements)} statements)")
        
        # 7. Criar usuário admin padrão
        print("📌 Criando usuário administrador...")
        
        # Criar tenant padrão
        await conn.execute("""
            INSERT INTO tenants (name, cnpj, plan_tier, is_active)
            VALUES ('Resolve Engenharia', '00000000000000', 'ENTERPRISE', TRUE)
            ON CONFLICT (cnpj) DO NOTHING
        """)
        
        tenant_id = await conn.fetchval("""
            SELECT id FROM tenants WHERE cnpj = '00000000000000' LIMIT 1
        """)
        
        # Criar user admin
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_context.hash("admin123")
        
        await conn.execute("""
            INSERT INTO users (email, hashed_password, full_name, role, is_active, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (email) DO NOTHING
        """, "admin@propor.eng.br", hashed, "Administrador do Sistema", "OWNER", True, tenant_id)
        
        print("✅ Admin criado: admin@propor.eng.br / admin123")
        
        await conn.close()
        
        print("\n" + "="*60)
        print("✅ BANCO RESETADO COM SUCESSO!")
        print("="*60)
        print("\n📋 Próximos passos:")
        print("  1. python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload")
        print("\n")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        if conn:
            try:
                await conn.close()
            except:
                pass

if __name__ == "__main__":
    exit_code = asyncio.run(reset_database())
    sys.exit(exit_code)
    asyncio.run(reset_database())
