#!/usr/bin/env python3
"""
Testes para o sistema de Background Jobs
"""

import asyncio
from uuid import UUID
from services.background_jobs import BackgroundJobManager
from services.job_handlers import JOB_HANDLERS
from settings import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

async def test_job_manager_connection():
    """Testa conexão com Redis"""
    logger.info("🧪 Testando conexão do Job Manager com Redis...")
    
    job_manager = BackgroundJobManager(settings.REDIS_URL)
    await job_manager.connect()
    
    assert job_manager.is_connected == True
    logger.info("✅ Conexão com Redis bem-sucedida")
    
    await job_manager.disconnect()

async def test_enqueue_job():
    """Testa enfileiramento de jobs"""
    logger.info("🧪 Testando enfileiramento de jobs...")
    
    job_manager = BackgroundJobManager(settings.REDIS_URL)
    await job_manager.connect()
    
    # Test job data
    job_data = {
        "budget_id": "123e4567-e89b-12d3-a456-426614174000",
        "user_id": "123e4567-e89b-12d3-a456-426614174001"
    }
    
    # Enqueue job
    job_id = await job_manager.enqueue_job(
        job_type="export_budget_excel",
        payload=job_data,
        priority="high"
    )
    
    assert job_id is not None
    assert len(job_id) == 36  # UUID length
    logger.info(f"✅ Job enfileirado com ID: {job_id}")
    
    # Check job status
    status = await job_manager.get_job_status(job_id)
    assert status is not None
    assert status["id"] == job_id
    assert status["type"] == "export_budget_excel"
    assert status["status"] == "queued"
    
    logger.info("✅ Status do job recuperado com sucesso")
    
    await job_manager.disconnect()

async def test_job_handlers_registration():
    """Testa se os handlers de jobs estão registrados"""
    logger.info("🧪 Testando registro de handlers de jobs...")
    
    # Import para garantir registro
    import services.job_handlers  # noqa
    
    assert "export_budget_excel" in JOB_HANDLERS
    assert "process_large_import" in JOB_HANDLERS
    assert "generate_report" in JOB_HANDLERS
    
    logger.info("✅ Todos os handlers de jobs estão registrados")
    logger.info(f"📋 Handlers registrados: {list(JOB_HANDLERS.keys())}")

async def test_update_job_status():
    """Testa atualização de status de jobs"""
    logger.info("🧪 Testando atualização de status de jobs...")
    
    job_manager = BackgroundJobManager(settings.REDIS_URL)
    await job_manager.connect()
    
    # Create test job
    job_id = await job_manager.enqueue_job(
        job_type="test_job",
        payload={"test": "data"},
        priority="normal"
    )
    
    # Update status
    await job_manager.update_job_status(job_id, "processing")
    
    # Check updated status
    status = await job_manager.get_job_status(job_id)
    assert status["status"] == "processing"
    
    # Update with result
    await job_manager.update_job_status(job_id, "completed", {"result": "success"})
    
    status = await job_manager.get_job_status(job_id)
    assert status["status"] == "completed"
    assert status["result"] == {"result": "success"}
    
    logger.info("✅ Atualização de status de jobs funcionando")
    
    await job_manager.disconnect()

async def run_all_tests():
    """Executa todos os testes"""
    logger.info("🚀 Iniciando testes de Background Jobs...")
    
    try:
        await test_job_manager_connection()
        await test_job_handlers_registration()
        await test_enqueue_job()
        await test_update_job_status()
        
        logger.info("🎉 Todos os testes de Background Jobs passaram!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Teste falhou: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)