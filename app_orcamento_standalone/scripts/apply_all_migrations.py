#!/usr/bin/env python
"""
Script para aplicar TODAS as migrações em ordem correta.
Usa asyncpg direto para melhor suporte a múltiplos statements.
"""

import asyncio
import sys
import re
from pathlib import Path

try:
    import asyncpg
except ImportError:
    print("❌ asyncpg não encontrado. Instale com: pip install asyncpg")
    sys.exit(1)

# Adicionar o diretório pai ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from settings import get_settings

MIGRATIONS = [
    "001_data_immutability.sql",
    "002_performance_indexes.sql",
    "002_wbs_hierarchy.sql",
    "003_bdi_social_charges.sql",
    "003_row_level_security.sql",
    "004_reference_price_types.sql",
    "005_soft_delete.sql",
    "006_trash_and_cascade.sql",
]

def parse_db_url(db_url: str) -> dict:
    """Extrai credenciais da DATABASE_URL."""
    # Formato: postgresql+asyncpg://user:password@host:port/dbname
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

async def apply_migration(conn, migration_file: str) -> bool:
    """Aplica uma migração individual."""
    migration_path = Path(__file__).parent.parent / "migrations" / migration_file
    
    if not migration_path.exists():
        print(f"❌ Arquivo não encontrado: {migration_file}")
        return False
    
    try:
        with open(migration_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
        
        # Remover comentários de linha (--) mas NÃO dentro de $$ ... $$
        lines = []
        in_dollar_block = False
        for line in sql_content.split('\n'):
            if '$$' in line:
                # Contar quantos $$ estão na linha
                if line.count('$$') % 2 == 1:
                    in_dollar_block = not in_dollar_block
                lines.append(line)
            elif in_dollar_block:
                lines.append(line)
            else:
                # Remover comentário
                if '--' in line:
                    line = line[:line.index('--')]
                if line.strip():
                    lines.append(line)
        
        sql_content = '\n'.join(lines)
        
        # Dividir por ; mas respeitando blocos DO $$ ... $$
        statements = []
        current = []
        in_dollar = False
        
        for char in sql_content:
            if char == '$':
                # Procurar por $$ seguinte
                pass
            current.append(char)
            if '$$' in ''.join(current[-2:]):
                in_dollar = not in_dollar
            if char == ';' and not in_dollar:
                stmt = ''.join(current).strip()
                if stmt and not stmt.startswith('--'):
                    statements.append(stmt)
                current = []
        
        if current:
            stmt = ''.join(current).strip()
            if stmt and not stmt.startswith('--'):
                statements.append(stmt)
        
        # Executar cada statement
        for stmt in statements:
            if stmt:
                try:
                    await conn.execute(stmt)
                except asyncpg.exceptions.PostgresError as e:
                    # Se for "already exists" ou "já existe", ignorar (idempotente)
                    error_msg = str(e).lower()
                    if "already exists" in error_msg or "já existe" in error_msg:
                        pass
                    else:
                        raise
        
        print(f"✅ {migration_file}")
        return True
    
    except Exception as e:
        print(f"❌ {migration_file}: {str(e)[:100]}")
        return False

async def main():
    settings = get_settings()
    db_config = parse_db_url(settings.DATABASE_URL)
    
    print("\n" + "="*60)
    print("Aplicando todas as migrações em ordem...")
    print(f"Banco: {db_config['host']}:{db_config['port']}/{db_config['database']}")
    print("="*60 + "\n")
    
    conn = None
    try:
        # Conectar ao banco
        conn = await asyncpg.connect(**db_config)
        
        success_count = 0
        for migration in MIGRATIONS:
            if await apply_migration(conn, migration):
                success_count += 1
        
        print("\n" + "="*60)
        print(f"Resultado: {success_count}/{len(MIGRATIONS)} migrações aplicadas")
        print("="*60 + "\n")
        
        if success_count == len(MIGRATIONS):
            print("✅ Banco de dados configurado com sucesso!")
            print("   Todas as migrações foram aplicadas.")
            return 0
        else:
            print("⚠️  Algumas migrações falharam. Verifique o banco.")
            return 1
    
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        return 1
    
    finally:
        if conn:
            await conn.close()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
