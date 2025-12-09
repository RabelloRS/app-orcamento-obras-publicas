from typing import TypeVar, Type, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import InstrumentedAttribute
from routers.schemas_pagination import PaginationParams, PaginatedResponse

T = TypeVar('T')

async def paginate_query(
    db: AsyncSession,
    model: Type[T],
    pagination: PaginationParams,
    filters: List = None,
    order_by: InstrumentedAttribute = None,
    join_relationships: List = None,
    options: List = None
) -> Tuple[List[T], int]:
    """
    Execute paginated query and return results with total count
    """
    # Build base query
    query = select(model)
    
    # Apply joins for relationships
    if join_relationships:
        for relationship in join_relationships:
            query = query.join(relationship)

    # Apply filters
    if filters:
        query = query.where(*filters)
            
    # Apply options (eager loading etc)
    if options:
        query = query.options(*options)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    # Apply pagination
    query = query.offset(pagination.skip).limit(pagination.limit)
    
    # Apply ordering
    if order_by is not None:
        query = query.order_by(order_by)
    
    # Execute query
    result = await db.execute(query)
    items = result.scalars().all()
    
    return items, total

async def paginate_response(
    db: AsyncSession,
    model: Type[T],
    pagination: PaginationParams,
    response_model: Type,
    filters: List = None,
    order_by: InstrumentedAttribute = None,
    join_relationships: List = None,
    options: List = None
) -> PaginatedResponse:
    """
    Execute paginated query and return formatted response
    """
    items, total = await paginate_query(
        db, model, pagination, filters, order_by, join_relationships, options
    )
    
    # Convert to response model if provided
    if response_model:
        items = [response_model.from_orm(item) for item in items]
    
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size
    )