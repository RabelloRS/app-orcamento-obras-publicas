from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from auth.dependencies import get_current_user
from models import User, Project, ProjectBudget
from routers.schemas_projects import ProjectCreate, ProjectUpdate, ProjectResponse
from routers.schemas_pagination import PaginationParams, PaginatedResponse
from utils.pagination import paginate_response
from typing import List
from uuid import UUID

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        new_project = Project(
            tenant_id=current_user.tenant_id,
            created_by_id=current_user.id,
            name=project_in.name,
            description=project_in.description
        )
        db.add(new_project)
        await db.commit()
        await db.refresh(new_project)
        return new_project
    except Exception as e:
        import traceback
        with open("debug_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise e


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Filter by tenant_id automatically and exclude deleted
    filters = [
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    ]
    
    return await paginate_response(
        db=db,
        model=Project,
        pagination=pagination,
        response_model=ProjectResponse,
        filters=filters,
        order_by=Project.created_at.desc()
    )

@router.get("/trash", response_model=PaginatedResponse[ProjectResponse])
async def list_projects_trash(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filters = [
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_not(None)
    ]

    return await paginate_response(
        db=db,
        model=Project,
        pagination=pagination,
        response_model=ProjectResponse,
        filters=filters,
        order_by=Project.deleted_at.desc()
    )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).where(
        Project.id == project_id, 
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    result = await db.execute(query)
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).where(
        Project.id == project_id, 
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    result = await db.execute(query)
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
        
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).where(
        Project.id == project_id, 
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_(None)
    )
    result = await db.execute(query)
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Soft Delete + cascade to budgets in same tenant
    project.deleted_at = func.now()
    project.deleted_by_id = current_user.id
    project.deleted_reason = reason
    project.restored_at = None
    project.restored_by_id = None

    budgets_stmt = select(ProjectBudget).where(
        ProjectBudget.project_id == project.id,
        ProjectBudget.deleted_at.is_(None)
    )
    budgets_res = await db.execute(budgets_stmt)
    for budget in budgets_res.scalars().all():
        budget.deleted_at = func.now()
        budget.deleted_by_id = current_user.id
        budget.deleted_reason = "Projeto movido para lixeira"
        budget.restored_at = None
        budget.restored_by_id = None

    await db.commit()
    return {"message": "Project moved to trash"}


@router.post("/{project_id}/restore", response_model=ProjectResponse)
async def restore_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == current_user.tenant_id,
        Project.deleted_at.is_not(None)
    )
    project = (await db.execute(query)).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in trash")

    project.deleted_at = None
    project.deleted_by_id = None
    project.deleted_reason = None
    project.restored_at = func.now()
    project.restored_by_id = current_user.id

    budgets_stmt = select(ProjectBudget).where(ProjectBudget.project_id == project.id)
    budgets = (await db.execute(budgets_stmt)).scalars().all()
    for budget in budgets:
        budget.deleted_at = None
        budget.deleted_by_id = None
        budget.deleted_reason = None
        budget.restored_at = func.now()
        budget.restored_by_id = current_user.id

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}/hard")
async def hard_delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Project).where(
        Project.id == project_id,
        Project.tenant_id == current_user.tenant_id
    )
    project = (await db.execute(query)).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deleted_at is None:
        raise HTTPException(status_code=400, detail="Hard delete only allowed from trash")

    await db.delete(project)
    await db.commit()
    return {"message": "Project permanently deleted. This action is irreversible."}
