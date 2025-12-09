from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional
from fastapi import Request

# Configuração global de rate limiting
# Limites padrão para diferentes tipos de endpoints

def get_user_identifier(request: Request) -> str:
    """Identificador para rate limiting que considera usuário autenticado"""
    # Tenta obter o usuário da request se disponível
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    
    # Fallback para endereço IP
    return get_remote_address(request)

# Configuração principal do rate limiter
limiter = Limiter(
    key_func=get_user_identifier,  # Preferência por usuário autenticado
    default_limits=["1000/hour", "60/minute"],  # Limites globais padrão
    headers_enabled=True,  # Headers com informações de rate limiting
    strategy="fixed-window",  # Estratégia de rate limiting
)

# Configurações específicas por tipo de endpoint
RATE_LIMIT_CONFIG = {
    "auth": "10/minute",  # Endpoints de autenticação (strict)
    "public": "200/hour",  # Endpoints públicos
    "api": "1000/hour",  # API geral
    "import": "10/hour",  # Operações de importação (pesadas)
}
