from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, List

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware para adicionar headers de segurança HTTP"""
    
    def __init__(self, app, **headers):
        super().__init__(app)
        self.headers = self._get_default_headers()
        self.headers.update(headers)
    
    def _get_default_headers(self) -> Dict[str, str]:
        """Headers de segurança padrão recomendados"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
            "Content-Security-Policy": "default-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net;",
        }
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Adicionar headers de segurança
        for header, value in self.headers.items():
            response.headers[header] = value
        
        # Remover headers sensíveis
        self._remove_sensitive_headers(response)
        
        return response
    
    def _remove_sensitive_headers(self, response: Response):
        """Remover headers que podem expor informações sensíveis"""
        sensitive_headers = [
            "Server",
            "X-Powered-By",
            "X-AspNet-Version",
            "X-AspNetMvc-Version",
        ]
        
        for header in sensitive_headers:
            if header in response.headers:
                del response.headers[header]

# Configuração simplificada para uso rápido
def get_security_headers() -> Dict[str, str]:
    """Retorna os headers de segurança padrão"""
    return SecurityHeadersMiddleware(None)._get_default_headers()