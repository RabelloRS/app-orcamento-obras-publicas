#!/usr/bin/env python3
"""
Testes de Configuração de Segurança

Verifica se as configurações críticas de segurança estão funcionando corretamente.
"""

import os
import sys
from unittest.mock import patch, MagicMock

# Adicionar o diretório atual ao path para importar os módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_secret_key_from_env():
    """Testa se a SECRET_KEY é carregada de variáveis de ambiente"""
    print("🧪 Testando carregamento de SECRET_KEY de variáveis de ambiente...")
    
    # Mock das variáveis de ambiente
    with patch.dict(os.environ, {
        'SECRET_KEY': 'test-secret-key-from-env-123456',
        'DATABASE_URL': 'postgresql+asyncpg://test:test@localhost:5432/test'
    }):
        # Recarregar settings para pegar as variáveis mockadas
        import importlib
        import settings
        importlib.reload(settings)
        
        settings_instance = settings.get_settings()
        
        # Verificar se a SECRET_KEY foi carregada do ambiente
        assert settings_instance.SECRET_KEY == 'test-secret-key-from-env-123456', \
            f"SECRET_KEY não carregada do ambiente. Esperado: 'test-secret-key-from-env-123456', Obtido: {settings_instance.SECRET_KEY}"
        
        print("✅ SECRET_KEY carregada corretamente de variáveis de ambiente")

def test_fallback_secret_key():
    """Testa o fallback da SECRET_KEY quando não há variável de ambiente"""
    print("🧪 Testando fallback da SECRET_KEY...")
    
    # Remover variáveis de ambiente temporariamente
    with patch.dict(os.environ, {}, clear=True):
        import importlib
        import settings
        importlib.reload(settings)
        
        settings_instance = settings.get_settings()
        
        # Verificar se usa o fallback
        assert settings_instance.SECRET_KEY == 'fallback-insecure-key-change-in-production-1234567890abcdef', \
            f"Fallback da SECRET_KEY não funcionou. Esperado: 'fallback-insecure-key-change-in-production-1234567890abcdef', Obtido: {settings_instance.SECRET_KEY}"
        
        print("✅ Fallback da SECRET_KEY funcionando corretamente")

def test_database_url_from_env():
    """Testa se DATABASE_URL é carregada de variáveis de ambiente"""
    print("🧪 Testando carregamento de DATABASE_URL de variáveis de ambiente...")
    
    test_db_url = 'postgresql+asyncpg://user:pass@server:5432/prod_db'
    
    with patch.dict(os.environ, {
        'DATABASE_URL': test_db_url,
        'SECRET_KEY': 'test-key'
    }):
        import importlib
        import settings
        importlib.reload(settings)
        
        settings_instance = settings.get_settings()
        
        assert settings_instance.DATABASE_URL == test_db_url, \
            f"DATABASE_URL não carregada do ambiente. Esperado: {test_db_url}, Obtido: {settings_instance.DATABASE_URL}"
        
        print("✅ DATABASE_URL carregada corretamente de variáveis de ambiente")

def test_settings_cache():
    """Testa se as settings são cacheadas corretamente"""
    print("🧪 Testando cache das configurações...")
    
    with patch.dict(os.environ, {
        'SECRET_KEY': 'cache-test-key',
        'DATABASE_URL': 'postgresql+asyncpg://cache:test@localhost:5432/cache'
    }):
        import importlib
        import settings
        importlib.reload(settings)
        
        # Chamar get_settings múltiplas vezes
        settings1 = settings.get_settings()
        settings2 = settings.get_settings()
        
        # Verificar se é a mesma instância (cache funcionando)
        assert settings1 is settings2, "Cache das settings não está funcionando"
        
        print("✅ Cache das configurações funcionando corretamente")

def test_required_security_settings():
    """Testa se todas as configurações de segurança necessárias existem"""
    print("🧪 Testando configurações de segurança obrigatórias...")
    
    with patch.dict(os.environ, {
        'SECRET_KEY': 'required-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
        'DATABASE_URL': 'postgresql+asyncpg://test:test@localhost:5432/test'
    }):
        import importlib
        import settings
        importlib.reload(settings)
        
        settings_instance = settings.get_settings()
        
        # Verificar se todas as configurações necessárias existem
        required_settings = [
            'SECRET_KEY',
            'ALGORITHM', 
            'ACCESS_TOKEN_EXPIRE_MINUTES',
            'DATABASE_URL'
        ]
        
        for setting in required_settings:
            assert hasattr(settings_instance, setting), f"Configuração obrigatória {setting} não encontrada"
            assert getattr(settings_instance, setting) is not None, f"Configuração {setting} está None"
            if setting == 'SECRET_KEY':
                assert len(getattr(settings_instance, setting)) >= 32, f"SECRET_KEY muito curta: {len(getattr(settings_instance, setting))} caracteres"
        
        print("✅ Todas as configurações de segurança obrigatórias presentes")

def main():
    """Executa todos os testes de segurança"""
    print("🔒 Iniciando testes de configuração de segurança...\n")
    
    tests = [
        test_secret_key_from_env,
        test_fallback_secret_key,
        test_database_url_from_env,
        test_settings_cache,
        test_required_security_settings
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
            print()
        except Exception as e:
            failed += 1
            print(f"❌ Falha no teste {test.__name__}: {e}")
            print()
    
    print("📊 Resultado dos testes:")
    print(f"✅ Testes passados: {passed}")
    print(f"❌ Testes falhados: {failed}")
    print(f"📈 Total: {passed + failed}")
    
    if failed == 0:
        print("\n🎉 Todos os testes de segurança passaram!")
        return True
    else:
        print(f"\n⚠️  {failed} teste(s) falharam. Verifique a configuração.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)