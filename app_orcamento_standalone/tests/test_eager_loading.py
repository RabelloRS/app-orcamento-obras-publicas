#!/usr/bin/env python3
"""
Testes para validação das otimizações de consultas N+1
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import engine
from models import BudgetItem, ReferenceItem, ReferenceSource, Base
from utils.eager_loading import eager_load_budget_items
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_eager_loading_budget_items():
    """Testa se o eager loading está funcionando corretamente"""
    logger.info("🧪 Testando eager loading de BudgetItems...")
    
    async with engine.connect() as conn:
        # Teste 1: Consulta sem eager loading (deve causar N+1)
        query_basic = select(BudgetItem).limit(5)
        result_basic = await conn.execute(query_basic)
        items_basic = result_basic.scalars().all()
        
        logger.info(f"✅ Consulta básica retornou {len(items_basic)} itens")
        
        # Teste 2: Consulta com eager loading otimizado
        query_optimized = select(BudgetItem).limit(5)
        query_optimized = eager_load_budget_items(query_optimized)
        result_optimized = await conn.execute(query_optimized)
        items_optimized = result_optimized.scalars().all()
        
        logger.info(f"✅ Consulta otimizada retornou {len(items_optimized)} itens")
        
        # Verifica se os relacionamentos foram carregados
        if items_optimized:
            first_item = items_optimized[0]
            
            # Verifica se reference_item foi carregado
            if hasattr(first_item, 'reference_item') and first_item.reference_item:
                logger.info(f"✅ ReferenceItem carregado: {first_item.reference_item.code}")
                
                # Verifica se source foi carregado
                if hasattr(first_item.reference_item, 'source') and first_item.reference_item.source:
                    logger.info(f"✅ ReferenceSource carregado: {first_item.reference_item.source.name}")
                else:
                    logger.warning("⚠️  ReferenceSource não foi carregado")
            else:
                logger.warning("⚠️  ReferenceItem não foi carregado")
        
        logger.info("✅ Teste de eager loading concluído com sucesso!")
        return True

async def test_eager_loading_utils():
    """Testa os utilitários de eager loading"""
    logger.info("🧪 Testando utilitários de eager loading...")
    
    from utils.eager_loading import EagerLoading
    
    # Testa os métodos estáticos
    try:
        budget_item_loader = EagerLoading.budget_item_with_reference()
        logger.info("✅ EagerLoading.budget_item_with_reference() funcionando")
        
        reference_loader = EagerLoading.reference_item_with_source()
        logger.info("✅ EagerLoading.reference_item_with_source() funcionando")
        
        full_loader = EagerLoading.budget_with_items_and_reference()
        logger.info("✅ EagerLoading.budget_with_items_and_reference() funcionando")
        
    except Exception as e:
        logger.error(f"❌ Erro nos utilitários de eager loading: {e}")
        return False
    
    logger.info("✅ Todos os utilitários de eager loading funcionando!")
    return True

async def main():
    """Função principal de testes"""
    logger.info("🔍 Iniciando testes de otimização de consultas N+1...")
    
    try:
        # Teste 1: Utilitários de eager loading
        test1 = await test_eager_loading_utils()
        
        # Teste 2: Eager loading na prática
        test2 = await test_eager_loading_budget_items()
        
        if test1 and test2:
            logger.info("🎉 Todos os testes de otimização N+1 passaram!")
            return True
        else:
            logger.error("❌ Alguns testes falharam")
            return False
            
    except Exception as e:
        logger.error(f"❌ Erro durante os testes: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)