"""
Handlers específicos para diferentes tipos de jobs em background
"""

import asyncio
import io
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import ProjectBudget, BudgetItem, ReferenceItem, Project, User
from uuid import UUID
import logging
from services.background_jobs import register_job_handler, JOB_HANDLERS

logger = logging.getLogger(__name__)

@register_job_handler("export_budget_excel")
async def handle_export_budget_excel(payload: dict, db_session: AsyncSession):
    """
    Handler para exportação de orçamento em Excel em background
    """
    budget_id = UUID(payload["budget_id"])
    user_id = UUID(payload["user_id"])
    
    logger.info(f"📊 Processando exportação Excel para orçamento {budget_id}")
    
    try:
        # Verifica acesso
        user = await db_session.get(User, user_id)
        if not user:
            return {"error": "Usuário não encontrado"}
        
        budget_query = select(ProjectBudget).join(Project).where(
            ProjectBudget.id == budget_id,
            Project.tenant_id == user.tenant_id
        )
        budget = (await db_session.execute(budget_query)).scalars().first()
        if not budget:
            return {"error": "Orçamento não encontrado"}
        
        # Fetch Items com eager loading
        from utils.eager_loading import eager_load_budget_items
        query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
        query = eager_load_budget_items(query)
        result = await db_session.execute(query)
        items = result.scalars().all()
        
        # Create DataFrame
        data = []
        for item in items:
            code = item.custom_code or (item.reference_item.code if item.reference_item else "")
            desc = item.custom_description or (item.reference_item.description if item.reference_item else "")
            unit = item.reference_item.unit if item.reference_item else "UN"

            data.append({
                "Código": code,
                "Descrição": desc,
                "Unidade": unit,
                "Quantidade": float(item.quantity),
                "Preço Unitário": float(item.unit_price),
                "Total": float(item.total_price)
            })
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Orçamento', index=False)
            
            # Adiciona formatação
            worksheet = writer.sheets['Orçamento']
            
            # Formata cabeçalhos
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column].width = adjusted_width
        
        excel_data = output.getvalue()
        
        # Aqui você pode salvar o arquivo em storage ou retornar como base64
        # Por enquanto retornamos o tamanho para demonstração
        return {
            "success": True,
            "file_size": len(excel_data),
            "items_count": len(items),
            "budget_name": budget.name
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na exportação Excel: {str(e)}")
        return {"error": str(e)}


@register_job_handler("process_large_import")
async def handle_process_large_import(payload: dict, db_session: AsyncSession):
    """
    Handler para processamento de imports grandes em background
    """
    import_data = payload["data"]
    user_id = UUID(payload["user_id"])
    
    logger.info(f"📊 Processando importação grande com {len(import_data)} registros")
    
    try:
        # Simula processamento demorado
        total_records = len(import_data)
        processed = 0
        
        for record in import_data:
            # Simula processamento de cada registro
            await asyncio.sleep(0.1)  # 100ms por registro
            processed += 1
            
            # Aqui viria a lógica real de importação
            # Ex: criar/atualizar itens de referência, preços, etc.
        
        return {
            "success": True,
            "processed_records": processed,
            "total_records": total_records
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no processamento de importação: {str(e)}")
        return {"error": str(e)}


@register_job_handler("generate_report")
async def handle_generate_report(payload: dict, db_session: AsyncSession):
    """
    Handler para geração de relatórios complexos em background
    """
    report_type = payload["report_type"]
    filters = payload.get("filters", {})
    user_id = UUID(payload["user_id"])
    
    logger.info(f"📊 Gerando relatório {report_type} com filtros: {filters}")
    
    try:
        # Simula geração de relatório complexo
        await asyncio.sleep(5)  # 5 segundos de processamento
        
        return {
            "success": True,
            "report_type": report_type,
            "generated_at": asyncio.get_event_loop().time(),
            "summary": {
                "total_items": 1500,
                "total_value": 1250000.50,
                "time_period": "2024"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na geração de relatório: {str(e)}")
        return {"error": str(e)}