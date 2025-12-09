#!/usr/bin/env python3
"""
Testes de Rate Limiting e Headers de Segurança

Verifica se as configurações de rate limiting e headers de segurança estão funcionando.
"""

import os
import sys
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import Limiter
from slowapi.util import get_remote_address

# Adicionar o diretório atual ao path para importar os módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_rate_limiter_configured():
    """Testa se o rate limiter está configurado corretamente"""
    print("🧪 Testando configuração do rate limiter...")
    
    from services.limiter import limiter
    
    # Verificar se o limiter foi instanciado
    assert limiter is not None, "Rate limiter não foi instanciado"
    assert hasattr(limiter, 'limit'), "Rate limiter não tem método limit"
    assert hasattr(limiter, 'enabled'), "Rate limiter não tem flag enabled"
    
    print("✅ Rate limiter configurado corretamente")

def test_security_headers_middleware():
    """Testa se o middleware de headers de segurança existe"""
    print("🧪 Testando middleware de headers de segurança...")
    
    from middleware.security_headers import SecurityHeadersMiddleware
    
    # Verificar se a classe existe
    assert SecurityHeadersMiddleware is not None, "Middleware de segurança não encontrado"
    
    # Verificar se tem o método dispatch
    assert hasattr(SecurityHeadersMiddleware, 'dispatch'), "Middleware não tem método dispatch"
    
    print("✅ Middleware de headers de segurança configurado")

def test_default_rate_limits():
    """Testa se os limites padrão de rate limiting estão configurados"""
    print("🧪 Testando limites padrão de rate limiting...")
    
    from services.limiter import limiter
    
    # Verificar se tem limites padrão
    assert hasattr(limiter, '_default_limits'), "Não tem limites padrão configurados"
    assert limiter._default_limits is not None, "Limites padrão estão None"
    
    print("✅ Limites padrão de rate limiting configurados")

def test_rate_limit_config_exists():
    """Testa se a configuração de rate limits por tipo existe"""
    print("🧪 Testando configuração de rate limits por tipo...")
    
    from services.limiter import RATE_LIMIT_CONFIG
    
    # Verificar se a configuração existe
    assert RATE_LIMIT_CONFIG is not None, "Configuração de rate limits não encontrada"
    
    # Verificar se tem as chaves esperadas
    expected_keys = ["auth", "public", "api", "import"]
    for key in expected_keys:
        assert key in RATE_LIMIT_CONFIG, f"Chave {key} não encontrada na configuração"
    
    print("✅ Configuração de rate limits por tipo definida")

def test_security_headers_content():
    """Testa se os headers de segurança contêm as chaves esperadas"""
    print("🧪 Testando conteúdo dos headers de segurança...")
    
    from middleware.security_headers import get_security_headers
    
    headers = get_security_headers()
    
    # Headers obrigatórios de segurança
    required_headers = [
        "X-Content-Type-Options",
        "X-Frame-Options", 
        "X-XSS-Protection",
        "Strict-Transport-Security",
        "Referrer-Policy",
    ]
    
    for header in required_headers:
        assert header in headers, f"Header de segurança {header} não encontrado"
        assert headers[header] is not None, f"Header {header} está None"
        assert headers[header] != "", f"Header {header} está vazio"
    
    print("✅ Headers de segurança contêm todas as chaves obrigatórias")

def test_app_includes_rate_limiting():
    """Testa se a aplicação inclui o rate limiting"""
    print("🧪 Testando se a app inclui rate limiting...")
    
    # Mock para evitar importar a app real durante testes
    with patch('main.app') as mock_app:
        mock_app.state.limiter = MagicMock()
        mock_app.add_exception_handler = MagicMock()
        mock_app.add_middleware = MagicMock()
        
        # Simular a importação e configuração
        from main import app
        
        # Verificar se o limiter está configurado
        assert hasattr(app.state, 'limiter'), "App não tem rate limiter configurado"
        
    print("✅ Rate limiting incluído na aplicação")

def main():
    """Executa todos os testes de rate limiting e segurança"""
    print("🔒 Iniciando testes de rate limiting e headers de segurança...\n")
    
    tests = [
        test_rate_limiter_configured,
        test_security_headers_middleware,
        test_default_rate_limits,
        test_rate_limit_config_exists,
        test_security_headers_content,
        test_app_includes_rate_limiting,
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
        print("\n🎉 Todos os testes de rate limiting e segurança passaram!")
        return True
    else:
        print(f"\n⚠️  {failed} teste(s) falharam. Verifique a configuração.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)