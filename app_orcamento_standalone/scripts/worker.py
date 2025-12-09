#!/usr/bin/env python3
"""
Worker para processamento de jobs em background
Execute este script para iniciar os workers que processarão jobs da fila Redis
"""

import asyncio
import logging
from services.background_jobs import BackgroundJobManager, process_jobs
from database import get_db
from sqlalchemy.ext.asyncio import create_async_engine
from settings import get_settings

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('background_worker.log')
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Função principal do worker"""
    settings = get_settings()
    
    # Conecta ao Redis
    job_manager = BackgroundJobManager(settings.REDIS_URL)
    await job_manager.connect()
    
    if not job_manager.is_connected:
        logger.error("❌ Não foi possível conectar ao Redis. Verifique a configuração.")
        return
    
    # Cria engine do banco de dados
    engine = create_async_engine(settings.DATABASE_URL)
    
    logger.info("🚀 Iniciando workers de background jobs...")
    logger.info(f"📊 Redis: {settings.REDIS_URL}")
    logger.info(f"🗄️  Database: {settings.DATABASE_URL}")
    
    try:
        # Importa os handlers para registro
        import services.job_handlers  # noqa
        
        # Inicia o processamento de jobs
        async with engine.connect() as conn:
            # Cria uma sessão async para o processamento
            async with conn.begin():
                await process_jobs(job_manager, conn, max_workers=3)
                
    except KeyboardInterrupt:
        logger.info("⏹️  Worker interrompido pelo usuário")
    except Exception as e:
        logger.error(f"❌ Erro fatal no worker: {str(e)}")
    finally:
        await job_manager.disconnect()
        await engine.dispose()
        logger.info("✅ Worker finalizado")

if __name__ == "__main__":
    asyncio.run(main())