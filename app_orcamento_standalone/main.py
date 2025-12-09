from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from settings import get_settings
from services.limiter import limiter
from middleware.security_headers import SecurityHeadersMiddleware
from services.background_jobs import BackgroundJobManager

try:
    import redis.asyncio as redis
except ImportError:
    redis = None

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for Public Works Budgeting System (SINAPI, SICRO, etc.)"
)

# Rate Limiting Global
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)  # Middleware do slowapi para rate limiting

# Headers de Segurança HTTP
app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from auth.router import router as auth_router
from routers.data import router as data_router
from routers.projects import router as projects_router
from routers.budgets import router as budgets_router
from routers.memorials import router as memorials_router
from routers.analytics import router as analytics_router
from routers.export import router as export_router
from routers.schedules import router as schedules_router
from routers.measurements import router as measurements_router

app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(data_router, prefix=settings.API_PREFIX)
app.include_router(projects_router, prefix=settings.API_PREFIX)
app.include_router(budgets_router, prefix=settings.API_PREFIX)
app.include_router(memorials_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(export_router, prefix=settings.API_PREFIX)
app.include_router(schedules_router, prefix=settings.API_PREFIX)
app.include_router(measurements_router, prefix=settings.API_PREFIX)

# Inicializa o job manager (comentado temporariamente)
# job_manager = BackgroundJobManager(settings.REDIS_URL)

# Variável global para o job_manager (será inicializado por referência)
job_manager = None

try:
    from services.background_jobs import BackgroundJobManager
    job_manager = BackgroundJobManager(settings.REDIS_URL)
except Exception as e:
    print(f"Aviso: Não foi possível inicializar BackgroundJobManager: {e}")
    job_manager = None

# Removido temporariamente para debug
# @app.on_event("startup")
# async def startup_event():
#     """Conecta ao Redis na inicialização"""
#     if job_manager is None:
#         return
#     try:
#         await job_manager.connect()
#     except Exception as e:
#         # Log error but don't crash app. Background jobs will be disabled.
#         # logger.error(f"Failed to connect to Redis on startup: {e}")
#         pass

# Comentado temporariamente para debug
# @app.on_event("shutdown")
# async def shutdown_event():
#     """Desconecta do Redis no shutdown"""
#     await job_manager.disconnect()

@app.get("/health")
async def health_check():
    """Endpoint de health check do sistema"""
    redis_status = "connected" if (job_manager and job_manager.is_connected) else "disconnected"
    
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "redis": redis_status,
        "background_jobs": "enabled" if job_manager else "disabled"
    }

@app.get("/system/status")
async def system_status():
    """Status detalhado do sistema"""
    redis_status = "disconnected"
    try:
        # Verifica conexão com Redis
        if redis and job_manager:
            redis_client = redis.from_url(settings.REDIS_URL)
            await redis_client.ping()
            redis_status = "connected"
            await redis_client.close()
    except Exception:
        redis_status = "disconnected"
    
    return {
        "app": "running",
        "version": settings.VERSION,
        "redis": redis_status,
        "background_jobs": {
            "enabled": True if job_manager else False,
            "manager_status": "connected" if (job_manager and job_manager.is_connected) else "disconnected"
        }
    }

from routers.catalog import router as catalog_router
app.include_router(catalog_router, prefix=settings.API_PREFIX)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    # Redirecionar para o app principal
    return RedirectResponse(url="/static/app.html")
