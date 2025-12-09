"""
Sistema de Background Jobs para operações pesadas
Usa Redis como broker de mensagens para processamento assíncrono
"""

import asyncio
import json
import uuid
from typing import Callable, Any, Dict, Optional
import redis.asyncio as redis
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logger = logging.getLogger(__name__)

class BackgroundJobManager:
    """Gerenciador de jobs em background com Redis"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.is_connected = False
    
    async def connect(self):
        """Conecta ao Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            self.is_connected = True
            logger.info("✅ Conectado ao Redis para background jobs")
        except RedisConnectionError as e:
            logger.error(f"❌ Falha ao conectar com Redis: {e}")
            self.is_connected = False
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self.redis_client:
            await self.redis_client.close()
            self.is_connected = False
            logger.info("✅ Desconectado do Redis")
    
    async def enqueue_job(
        self, 
        job_type: str, 
        payload: Dict[str, Any], 
        priority: str = "normal"
    ) -> str:
        """
        Adiciona um job à fila
        
        Args:
            job_type: Tipo do job (export_excel, process_import, etc.)
            payload: Dados do job
            priority: Prioridade (high, normal, low)
            
        Returns:
            ID do job
        """
        if not self.is_connected:
            raise RuntimeError("Redis não conectado")
        
        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "type": job_type,
            "payload": payload,
            "priority": priority,
            "status": "queued",
            "created_at": asyncio.get_event_loop().time()
        }
        
        # Adiciona à fila apropriada baseada na prioridade
        queue_name = f"jobs:{priority}"
        await self.redis_client.lpush(queue_name, json.dumps(job_data))
        
        # Também armazena o job no hash de jobs para tracking
        await self.redis_client.hset("jobs:metadata", job_id, json.dumps(job_data))
        
        logger.info(f"📤 Job enfileirado: {job_id} (tipo: {job_type}, prioridade: {priority})")
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Obtém o status de um job"""
        if not self.is_connected:
            return None
            
        job_data = await self.redis_client.hget("jobs:metadata", job_id)
        if job_data:
            return json.loads(job_data)
        return None
    
    async def update_job_status(self, job_id: str, status: str, result: Any = None):
        """Atualiza o status de um job"""
        if not self.is_connected:
            return
            
        job_data = await self.get_job_status(job_id)
        if job_data:
            job_data["status"] = status
            job_data["result"] = result
            job_data["updated_at"] = asyncio.get_event_loop().time()
            
            await self.redis_client.hset("jobs:metadata", job_id, json.dumps(job_data))
            logger.info(f"📊 Job {job_id} atualizado para status: {status}")


# Registro de handlers de jobs
JOB_HANDLERS = {}

def register_job_handler(job_type: str):
    """Decorator para registrar handlers de jobs"""
    def decorator(handler: Callable):
        JOB_HANDLERS[job_type] = handler
        return handler
    return decorator


async def process_jobs(
    job_manager: BackgroundJobManager, 
    db_session: AsyncSession,
    max_workers: int = 3
):
    """
    Processa jobs da fila continuamente
    
    Args:
        job_manager: Instância do gerenciador de jobs
        db_session: Sessão do banco de dados
        max_workers: Número máximo de workers simultâneos
    """
    if not job_manager.is_connected:
        logger.error("❌ Não é possível processar jobs - Redis não conectado")
        return
    
    logger.info(f"🚀 Iniciando processamento de jobs com {max_workers} workers")
    
    semaphore = asyncio.Semaphore(max_workers)
    
    async def worker():
        while True:
            try:
                # Tenta obter jobs por prioridade: high -> normal -> low
                for priority in ["high", "normal", "low"]:
                    queue_name = f"jobs:{priority}"
                    job_data_str = await job_manager.redis_client.rpop(queue_name)
                    
                    if job_data_str:
                        async with semaphore:
                            job_data = json.loads(job_data_str)
                            job_id = job_data["id"]
                            job_type = job_data["type"]
                            
                            logger.info(f"🔧 Processando job {job_id} (tipo: {job_type})")
                            
                            # Atualiza status para processing
                            await job_manager.update_job_status(job_id, "processing")
                            
                            try:
                                # Executa o handler
                                handler = JOB_HANDLERS.get(job_type)
                                if handler:
                                    result = await handler(job_data["payload"], db_session)
                                    await job_manager.update_job_status(job_id, "completed", result)
                                    logger.info(f"✅ Job {job_id} concluído com sucesso")
                                else:
                                    error_msg = f"Handler não encontrado para job type: {job_type}"
                                    await job_manager.update_job_status(job_id, "failed", error_msg)
                                    logger.error(f"❌ {error_msg}")
                            
                            except Exception as e:
                                error_msg = f"Erro ao processar job: {str(e)}"
                                await job_manager.update_job_status(job_id, "failed", error_msg)
                                logger.error(f"❌ Falha no job {job_id}: {error_msg}")
                            
                        break  # Sai do loop de prioridades após processar um job
                    
                # Espera breve antes de verificar novamente
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Erro no worker: {str(e)}")
                await asyncio.sleep(5)  # Espera antes de tentar novamente
    
    # Inicia múltiplos workers
    workers = [worker() for _ in range(max_workers)]
    await asyncio.gather(*workers)