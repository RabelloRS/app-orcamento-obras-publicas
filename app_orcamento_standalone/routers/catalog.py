"""
Catalog Router - Gerenciamento de Itens de Referência

REGRA MAGNA: Itens de bases oficiais (SINAPI, SICRO) são IMUTÁVEIS.
Para editar, o usuário deve criar uma cópia como "Composição Própria".
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from auth.dependencies import get_current_user
from models import User, ReferenceItem, ReferenceSource, CustomComposition, CustomCompositionItem, CompositionItem
from typing import List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel
from decimal import Decimal
import httpx
import re

router = APIRouter(prefix="/catalog", tags=["Catalog"])


# === SCHEMAS ===

class CatalogItemResponse(BaseModel):
    id: UUID
    code: str
    description: str
    unit: str
    type: str
    source_name: str
    is_official: bool
    is_locked: bool
    
    class Config:
        from_attributes = True


class CustomCompositionCreate(BaseModel):
    """Schema para criar composição própria"""
    original_item_id: Optional[UUID] = None  # Se for cópia
    code: str
    description: str
    unit: str
    type: str = "COMPOSITION"


class CustomCompositionResponse(BaseModel):
    id: UUID
    code: str
    description: str
    unit: str
    type: str
    source_name: str
    unit_price: Decimal
    
    class Config:
        from_attributes = True


class DNITMonthAvailable(BaseModel):
    year: int
    month: int
    month_name: str
    url: Optional[str] = None


class TreeNodeResponse(BaseModel):
    """Resposta para nó da árvore de navegação"""
    id: str  # Pode ser code prefix ou UUID
    label: str
    type: str  # "group", "subgroup", "item"
    item_type: Optional[str] = None  # COMPOSITION, LABOR, EQUIPMENT, MATERIAL
    count: int = 0
    has_children: bool = True
    code: Optional[str] = None
    unit: Optional[str] = None


# === NAVEGADOR DE CATÁLOGO (ÁRVORE) ===

from sqlalchemy import func, distinct

@router.get("/navigator/sources")
async def get_catalog_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar fontes disponíveis (SINAPI, SICRO, etc.)"""
    query = select(ReferenceSource)
    result = await db.execute(query)
    sources = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description or s.name
        }
        for s in sources
    ]


@router.get("/navigator/types")
async def get_item_types(
    source: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar tipos de itens disponíveis (COMPOSITION, LABOR, EQUIPMENT, MATERIAL).
    Retorna contagem de itens por tipo.
    """
    query = select(
        ReferenceItem.type,
        func.count(ReferenceItem.id).label("count")
    ).group_by(ReferenceItem.type)
    
    if source:
        query = query.join(ReferenceSource).where(ReferenceSource.name == source)
    
    result = await db.execute(query)
    
    type_labels = {
        "COMPOSITION": "🔧 Composições",
        "SERVICE": "🔧 Serviços",
        "LABOR": "👷 Mão de Obra",
        "EQUIPMENT": "🚜 Equipamentos",
        "MATERIAL": "🧱 Materiais",
        "INPUT": "📦 Insumos"
    }
    
    rows = result.all()

    # Garante que "SERVICE" apareça na lista mesmo que ainda não haja contagem (UX: usuário encontra Serviços direto)
    type_map = {row.type: row.count for row in rows}
    if "SERVICE" not in type_map:
        type_map["SERVICE"] = 0

    return [
        TreeNodeResponse(
            id=t,
            label=type_labels.get(t, t),
            type="type",
            item_type=t,
            count=type_map[t],
            has_children=True
        )
        for t in sorted(type_map.keys())
    ]


@router.get("/navigator/groups")
async def get_code_groups(
    item_type: Optional[str] = None,
    source: Optional[str] = None,
    prefix: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Navegar pelos grupos baseados no prefixo do código.
    
    SINAPI usa códigos como: 73922, 87654, etc.
    Agrupamos pelos primeiros 2 dígitos para formar "grupos".
    
    - Sem prefix: retorna grupos principais (2 primeiros dígitos)
    - Com prefix de 2 dígitos: retorna subgrupos (3 dígitos)
    - Com prefix maior: retorna itens
    """
    # Determinar nível de agrupamento
    if not prefix:
        # Nível 1: Grupos principais (2 primeiros dígitos)
        group_length = 2
    elif len(prefix) == 2:
        # Nível 2: Subgrupos (primeiros 3-4 dígitos)
        group_length = 4
    else:
        # Nível 3+: Listar itens diretamente
        return await _list_items_by_prefix(prefix, item_type, source, db)
    
    # Query para agrupar por prefixo
    prefix_expr = func.left(ReferenceItem.code, group_length)
    
    query = select(
        prefix_expr.label("code_prefix"),
        func.count(ReferenceItem.id).label("count"),
        func.min(ReferenceItem.description).label("sample_desc")
    ).group_by(prefix_expr)
    
    if item_type:
        query = query.where(ReferenceItem.type == item_type)
    
    if source:
        query = query.join(ReferenceSource).where(ReferenceSource.name == source)
    
    if prefix:
        query = query.where(ReferenceItem.code.startswith(prefix))
    
    query = query.order_by(prefix_expr)
    
    result = await db.execute(query)
    
    groups = []
    for row in result.all():
        if row.code_prefix and row.code_prefix.strip():
            groups.append(TreeNodeResponse(
                id=row.code_prefix,
                label=f"Grupo {row.code_prefix} ({row.count} itens)",
                type="group" if len(row.code_prefix) == 2 else "subgroup",
                count=row.count,
                has_children=True,
                code=row.code_prefix
            ))
    
    return groups


async def _list_items_by_prefix(prefix: str, item_type: Optional[str], source: Optional[str], db: AsyncSession):
    """Listar itens que começam com o prefixo especificado"""
    query = select(ReferenceItem).where(ReferenceItem.code.startswith(prefix))
    
    if item_type:
        query = query.where(ReferenceItem.type == item_type)
    
    if source:
        query = query.join(ReferenceSource).where(ReferenceSource.name == source)
    
    query = query.limit(100).order_by(ReferenceItem.code)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        TreeNodeResponse(
            id=str(item.id),
            label=f"{item.code} - {item.description[:60]}{'...' if len(item.description) > 60 else ''}",
            type="item",
            item_type=item.type,
            count=0,
            has_children=False,
            code=item.code,
            unit=item.unit
        )
        for item in items
    ]


@router.get("/navigator/search")
async def search_catalog_items(
    q: str = Query(..., min_length=2),
    item_type: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buscar itens por código ou descrição"""
    from sqlalchemy import or_
    
    query = select(ReferenceItem).options(selectinload(ReferenceItem.source))
    
    # Busca por código ou descrição
    query = query.where(or_(
        ReferenceItem.code.ilike(f"%{q}%"),
        ReferenceItem.description.ilike(f"%{q}%")
    ))
    
    if item_type:
        query = query.where(ReferenceItem.type == item_type)
    
    if source:
        query = query.join(ReferenceSource).where(ReferenceSource.name == source)
    
    query = query.limit(limit).order_by(ReferenceItem.code)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return [
        {
            "id": str(item.id),
            "code": item.code,
            "description": item.description,
            "unit": item.unit,
            "type": item.type,
            "source": item.source.name if item.source else "N/A"
        }
        for item in items
    ]


@router.get("/composition/{item_id}")
async def get_composition_with_prices(
    item_id: UUID,
    state: str = Query("RS", min_length=2, max_length=2, description="Estado para preços (ex: RS, SP, RJ)"),
    charge_type: str = Query("DESONERADO", min_length=3, max_length=20, description="Tipo de encargos (DESONERADO ou NAO_DESONERADO)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna composição analítica com preços para o estado selecionado.
    Inclui todos os itens da composição com seus preços regionais.
    """
    from models import ReferencePrice
    
    # 1. Buscar item principal
    item_q = await db.execute(
        select(ReferenceItem)
        .options(selectinload(ReferenceItem.source))
        .where(ReferenceItem.id == item_id)
    )
    item = item_q.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # 2. Buscar preço do item principal
    main_price_q = await db.execute(
        select(ReferencePrice)
        .where(
            ReferencePrice.item_id == item_id,
            ReferencePrice.region == state,
            ReferencePrice.charge_type == charge_type,
            ReferencePrice.is_active == True
        )
        .order_by(ReferencePrice.date_validity.desc())
        .limit(1)
    )
    main_price = main_price_q.scalars().first()
    
    # 3. Buscar itens da composição
    comp_items_q = await db.execute(
        select(CompositionItem, ReferenceItem)
        .join(ReferenceItem, CompositionItem.child_item_id == ReferenceItem.id)
        .where(CompositionItem.parent_item_id == item_id)
    )
    
    # 4. Para cada item, buscar o preço do estado
    composition_items = []
    total_cost = Decimal("0")
    
    for comp_link, child_item in comp_items_q.all():
        # Buscar preço do item filho para o estado
        child_price_q = await db.execute(
            select(ReferencePrice)
            .where(
                ReferencePrice.item_id == child_item.id,
                ReferencePrice.region == state,
                ReferencePrice.charge_type == charge_type,
                ReferencePrice.is_active == True
            )
            .order_by(ReferencePrice.date_validity.desc())
            .limit(1)
        )
        child_price_obj = child_price_q.scalars().first()
        child_price = float(child_price_obj.price) if child_price_obj else 0.0
        
        # Calcular custo total do item na composição
        item_cost = float(comp_link.coefficient) * child_price
        total_cost += Decimal(str(item_cost))
        
        composition_items.append({
            "id": str(child_item.id),
            "code": child_item.code,
            "description": child_item.description,
            "unit": child_item.unit,
            "type": child_item.type,
            "coefficient": float(comp_link.coefficient),
            "unit_price": child_price,
            "total_price": round(item_cost, 2)
        })
    
    return {
        "id": str(item.id),
        "code": item.code,
        "description": item.description,
        "unit": item.unit,
        "type": item.type,
        "source_name": item.source.name if item.source else "N/A",
        "is_official": item.is_official,
        "is_locked": item.is_locked,
        "price": float(main_price.price) if main_price else 0.0,
        "state": state,
        "charge_type": charge_type,
        "items": composition_items,
        "calculated_cost": float(total_cost)
    }


# === ENDPOINTS ORIGINAIS ===

@router.get("/items/{item_id}", response_model=CatalogItemResponse)
async def get_catalog_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter detalhes de um item do catálogo"""
    query = select(ReferenceItem).options(selectinload(ReferenceItem.source)).where(ReferenceItem.id == item_id)
    result = await db.execute(query)
    item = result.scalars().first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    return {
        "id": item.id,
        "code": item.code,
        "description": item.description,
        "unit": item.unit,
        "type": item.type,
        "source_name": item.source.name if item.source else "N/A",
        "is_official": item.is_official,
        "is_locked": item.is_locked
    }


@router.patch("/items/{item_id}")
async def update_catalog_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    BLOQUEADO: Itens oficiais não podem ser editados.
    
    REGRA MAGNA: Dados de bases oficiais (SINAPI, SICRO) são IMUTÁVEIS.
    Use o endpoint /catalog/copy-to-custom para criar uma cópia editável.
    """
    item = await db.get(ReferenceItem, item_id)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    if item.is_locked:
        raise HTTPException(
            status_code=403, 
            detail="PROIBIDO: Este item pertence a uma base oficial (SINAPI/SICRO) e NÃO PODE ser editado. "
                   "Use /catalog/copy-to-custom/{item_id} para criar uma cópia editável."
        )
    
    # Se chegou aqui, o item não está bloqueado (improvável para itens oficiais)
    raise HTTPException(status_code=400, detail="Use a interface apropriada para edição.")


@router.post("/copy-to-custom/{item_id}", response_model=CustomCompositionResponse)
async def copy_to_custom_composition(
    item_id: UUID,
    custom_code: Optional[str] = Query(None, description="Código personalizado (opcional)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Criar uma cópia editável de uma composição oficial.
    
    O item original permanece IMUTÁVEL. A cópia é salva como "Composição Própria"
    e pode ser livremente editada pelo usuário.
    """
    # Buscar item original com composição
    query = select(ReferenceItem).options(selectinload(ReferenceItem.source)).where(ReferenceItem.id == item_id)
    result = await db.execute(query)
    original = result.scalars().first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Item original não encontrado")
    
    # Gerar código único se não fornecido
    if not custom_code:
        # Buscar próximo número sequencial
        count_q = await db.execute(
            select(CustomComposition).where(CustomComposition.tenant_id == current_user.tenant_id)
        )
        count = len(count_q.scalars().all())
        custom_code = f"PROP-{count + 1:04d}"
    
    # Criar composição própria
    new_composition = CustomComposition(
        id=uuid4(),
        tenant_id=current_user.tenant_id,
        original_item_id=original.id,
        code=custom_code,
        description=f"[CÓPIA] {original.description}",
        unit=original.unit,
        type=original.type,
        source_name="PRÓPRIA",
        unit_price=Decimal("0"),
        created_by_id=current_user.id
    )
    db.add(new_composition)
    
    # Copiar itens da composição original (se houver)
    comp_items_q = await db.execute(
        select(CompositionItem).where(CompositionItem.parent_item_id == item_id)
    )
    original_items = comp_items_q.scalars().all()
    
    for orig_item in original_items:
        new_item = CustomCompositionItem(
            id=uuid4(),
            composition_id=new_composition.id,
            reference_item_id=orig_item.child_item_id,
            unit=orig_item.child_item.unit if orig_item.child_item else "",
            coefficient=orig_item.coefficient,
            unit_price=Decimal("0")
        )
        db.add(new_item)
    
    await db.commit()
    await db.refresh(new_composition)
    
    return new_composition


@router.get("/custom", response_model=List[CustomCompositionResponse])
async def list_custom_compositions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar composições próprias do tenant"""
    query = select(CustomComposition).where(
        CustomComposition.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


# === DNIT ENDPOINTS ===

@router.get("/dnit/available-months", response_model=List[DNITMonthAvailable])
async def get_dnit_available_months():
    """
    Consultar site do DNIT e listar meses disponíveis para download do SICRO.
    
    Faz scraping da página oficial para encontrar os arquivos disponíveis.
    """
    MONTH_NAMES = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    
    try:
        # URL oficial do SICRO no site do DNIT
        url = "https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            response.raise_for_status()
            
            html = response.text
            
            # Encontrar links para arquivos SICRO
            available = []
            
            # Padrão: SICRO-2024-05.zip, sicro_202405.zip, etc.
            patterns = [
                r'href=["\']([^"\']*sicro[^"\']*(\d{4})[-_]?(\d{2})[^"\']*\.zip)["\']',
                r'href=["\']([^"\']*(\d{4})[-_]?(\d{2})[^"\']*sicro[^"\']*\.zip)["\']'
            ]
            
            seen = set()
            for pattern in patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                for match in matches:
                    url_found = match[0]
                    year = int(match[1])
                    month = int(match[2])
                    
                    key = (year, month)
                    if key not in seen and 2020 <= year <= 2030 and 1 <= month <= 12:
                        seen.add(key)
                        available.append(DNITMonthAvailable(
                            year=year,
                            month=month,
                            month_name=MONTH_NAMES.get(month, ""),
                            url=url_found if url_found.startswith("http") else f"https://www.gov.br{url_found}"
                        ))
            
            # Ordenar por data (mais recente primeiro)
            available.sort(key=lambda x: (x.year, x.month), reverse=True)
            
            # Se não encontrou nada via scraping, retornar lista padrão de meses recentes
            if not available:
                from datetime import datetime
                now = datetime.now()
                for i in range(12):
                    month = now.month - i
                    year = now.year
                    if month <= 0:
                        month += 12
                        year -= 1
                    available.append(DNITMonthAvailable(
                        year=year,
                        month=month,
                        month_name=MONTH_NAMES.get(month, "")
                    ))
            
            return available
            
    except Exception as e:
        # Em caso de erro, retornar lista de meses recentes
        from datetime import datetime
        now = datetime.now()
        available = []
        for i in range(12):
            month = now.month - i
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            available.append(DNITMonthAvailable(
                year=year,
                month=month,
                month_name=MONTH_NAMES.get(month, "")
            ))
        return available
