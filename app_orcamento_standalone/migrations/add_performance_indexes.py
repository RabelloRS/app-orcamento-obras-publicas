"""
Migração para adicionar índices de performance no banco de dados

Índices estratégicos para otimizar consultas frequentes e preparar para 100x crescimento de dados
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from settings import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_performance_indexes():
    """Adiciona índices de performance no banco de dados"""
    settings = get_settings()
    
    # Usa engine síncrono para migrações
    engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
    
    indexes = [
        # --- Índices para tabelas de referência (consultas frequentes) ---
        "CREATE INDEX IF NOT EXISTS idx_reference_items_code ON reference_items(code)",
        "CREATE INDEX IF NOT EXISTS idx_reference_items_source_id ON reference_items(source_id)",
        "CREATE INDEX IF NOT EXISTS idx_reference_items_code_source ON reference_items(code, source_id)",
        
        # --- Índices para preços (consultas por validade) ---
        "CREATE INDEX IF NOT EXISTS idx_reference_prices_item_id ON reference_prices(item_id)",
        "CREATE INDEX IF NOT EXISTS idx_reference_prices_date_validity ON reference_prices(date_validity)",
        "CREATE INDEX IF NOT EXISTS idx_reference_prices_item_validity ON reference_prices(item_id, date_validity)",
        "CREATE INDEX IF NOT EXISTS idx_reference_prices_active ON reference_prices(is_active)",
        
        # --- Índices para projetos e orçamentos (multi-tenant) ---
        "CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by_id)",
        "CREATE INDEX IF NOT EXISTS idx_projects_tenant_created ON projects(tenant_id, created_at)",
        
        "CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id)",
        "CREATE INDEX IF NOT EXISTS idx_project_budgets_status ON project_budgets(status)",
        "CREATE INDEX IF NOT EXISTS idx_project_budgets_reference_date ON project_budgets(reference_date)",
        
        # --- Índices para itens de orçamento (consultas de performance crítica) ---
        "CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id)",
        "CREATE INDEX IF NOT EXISTS idx_budget_items_reference_item_id ON budget_items(reference_item_id)",
        "CREATE INDEX IF NOT EXISTS idx_budget_items_budget_reference ON budget_items(budget_id, reference_item_id)",
        
        # --- Índices para usuários e tenants ---
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id)",
        "CREATE INDEX IF NOT EXISTS idx_users_tenant_active ON users(tenant_id, is_active)",
        
        # --- Índices para composições customizadas ---
        "CREATE INDEX IF NOT EXISTS idx_custom_compositions_tenant_id ON custom_compositions(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_custom_compositions_code ON custom_compositions(code)",
        "CREATE INDEX IF NOT EXISTS idx_custom_compositions_tenant_code ON custom_compositions(tenant_id, code)",
        
        "CREATE INDEX IF NOT EXISTS idx_custom_comp_items_composition_id ON custom_composition_items(composition_id)",
        "CREATE INDEX IF NOT EXISTS idx_custom_comp_items_reference_id ON custom_composition_items(reference_item_id)",
        
        # --- Índices para auditoria e logs ---
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
        
        "CREATE INDEX IF NOT EXISTS idx_upload_history_user_id ON upload_history(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_upload_history_status ON upload_history(status)",
        
        # --- Índices compostos para consultas complexas ---
        "CREATE INDEX IF NOT EXISTS idx_ref_items_source_code_desc ON reference_items(source_id, code, description)",
        "CREATE INDEX IF NOT EXISTS idx_budgets_project_status_date ON project_budgets(project_id, status, reference_date)",
        "CREATE INDEX IF NOT EXISTS idx_prices_item_active_validity ON reference_prices(item_id, is_active, date_validity)",
    ]
    
    try:
        with engine.connect() as conn:
            logger.info("🚀 Iniciando aplicação de índices de performance...")
            
            total_indexes = len(indexes)
            applied_indexes = 0
            
            for i, index_sql in enumerate(indexes, 1):
                try:
                    conn.execute(text(index_sql))
                    conn.commit()
                    applied_indexes += 1
                    logger.info(f"✅ [{i}/{total_indexes}] Índice aplicado: {index_sql[:80]}...")
                except Exception as e:
                    logger.warning(f"⚠️  [{i}/{total_indexes}] Erro ao aplicar índice: {e}")
                    conn.rollback()
            
            logger.info(f"🎉 Migração concluída! {applied_indexes}/{total_indexes} índices aplicados com sucesso")
            
            # Verifica índices existentes
            result = conn.execute(text("""
                SELECT tablename, indexname, indexdef 
                FROM pg_indexes 
                WHERE schemaname = 'public'
                ORDER BY tablename, indexname
            """))
            
            logger.info("📊 Índices existentes no banco:")
            for row in result:
                logger.info(f"   {row.tablename}.{row.indexname}")
                
    except Exception as e:
        logger.error(f"❌ Erro fatal na migração: {e}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    add_performance_indexes()