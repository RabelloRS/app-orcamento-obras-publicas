from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from auth.dependencies import get_current_user
from models import User, Project, ProjectBudget, BudgetItem
from utils.eager_loading import eager_load_budget_items
from services.background_jobs import BackgroundJobManager
from services.job_handlers import JOB_HANDLERS
from uuid import UUID
import io
import pandas as pd
from settings import get_settings

settings = get_settings()
job_manager = BackgroundJobManager(settings.REDIS_URL)

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/budget/{budget_id}/excel")
async def export_budget_excel(
    budget_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    async_mode: bool = False  # Novo parâmetro para escolher modo assíncrono
):
    """
    Exporta orçamento para Excel.
    
    Parâmetros:
    - async_mode: Se True, processa em background e retorna job ID
    - Se False (padrão), retorna o arquivo imediatamente (síncrono)
    """
    # Verify access
    budget_query = select(ProjectBudget).join(Project).where(
        ProjectBudget.id == budget_id,
        Project.tenant_id == current_user.tenant_id
    )
    budget = (await db.execute(budget_query)).scalars().first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if async_mode:
        # Modo assíncrono - enfileira job e retorna ID
        try:
            await job_manager.connect()
            job_id = await job_manager.enqueue_job(
                job_type="export_budget_excel",
                payload={
                    "budget_id": str(budget_id),
                    "user_id": str(current_user.id)
                },
                priority="high"
            )
            
            return JSONResponse({
                "message": "Exportação iniciada em background",
                "job_id": job_id,
                "status_url": f"/api/jobs/{job_id}/status"
            })
            
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Erro ao iniciar exportação assíncrona: {str(e)}"
            )
    
    else:
        # Modo síncrono - processamento imediato (comportamento original)
        # Fetch Items with eager loading to avoid N+1 queries
        query = select(BudgetItem).where(BudgetItem.budget_id == budget_id)
        query = eager_load_budget_items(query)
        result = await db.execute(query)
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

        # BytesIO
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Orçamento')
            # Add formatting here if needed using openpyxl

        output.seek(0)

        headers = {
            'Content-Disposition': f'attachment; filename="budget_{budget.name}.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@router.get("/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    """Obtém o status de um job em background"""
    try:
        await job_manager.connect()
        status_data = await job_manager.get_job_status(job_id)
        
        if not status_data:
            raise HTTPException(status_code=404, detail="Job não encontrado")
        
        return status_data
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Erro ao obter status do job: {str(e)}"
        )
