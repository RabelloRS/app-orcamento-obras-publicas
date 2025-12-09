from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from settings import get_settings

settings = get_settings()

# Configuração otimizada do engine com connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    # Connection Pool Settings
    pool_size=20,           # Número base de conexões no pool
    max_overflow=30,        # Conexões extras permitidas além do pool_size
    pool_timeout=30,        # Tempo máximo (segundos) para esperar por conexão
    pool_recycle=1800,      # Reciclar conexões a cada 30 minutos
    pool_pre_ping=True      # Verificar saúde da conexão antes de usar
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
