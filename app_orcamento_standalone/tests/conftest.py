import os
import sys
import pytest
from pathlib import Path

# Adiciona o diretório raiz ao PYTHONPATH
# Isso permite importar módulos como 'settings', 'main', 'routers', etc.
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

@pytest.fixture(scope="session", autouse=True)
def mock_env_vars():
    """Define variáveis de ambiente obrigatórias para testes"""
    os.environ["SECRET_KEY"] = "testing-secret-key-123"
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:" # Use in-memory DB for tests if possible avoiding production DB
    os.environ["REDIS_URL"] = "redis://localhost:6379/0" # Mock or strictly unit test?
    
    # Se precisar de mais variaveis, adicione aqui
