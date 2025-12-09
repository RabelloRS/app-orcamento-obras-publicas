from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, DECIMAL, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column, DeclarativeBase, MappedAsDataclass, backref
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
import uuid
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List

class Base(DeclarativeBase):
    pass

# --- Security & Organization (Phase 5/8) ---

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(18))
    logo_url: Mapped[Optional[str]] = mapped_column(String(255))
    plan_tier: Mapped[Optional[str]] = mapped_column(String(50), default='FREE')

    created_at: Mapped[datetime] = mapped_column(default=func.now())
    is_active: Mapped[bool] = mapped_column(default=True)
    
    users: Mapped[List["User"]] = relationship(back_populates="tenant", lazy="selectin")
    teams: Mapped[List["Team"]] = relationship(back_populates="tenant", lazy="selectin")

class Team(Base):
    __tablename__ = "teams"
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"))
    name: Mapped[str] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    tenant: Mapped["Tenant"] = relationship(back_populates="teams", lazy="selectin")
    members: Mapped[List["User"]] = relationship(back_populates="team", lazy="selectin")

class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[Optional[str]] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="USER") # OBSERVER, EDITOR, ADMIN, OWNER
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    
    # Organization
    tenant_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("tenants.id"))
    team_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("teams.id"))
    
    tenant: Mapped["Tenant"] = relationship(back_populates="users", lazy="selectin")
    team: Mapped["Team"] = relationship(back_populates="members", lazy="selectin")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50)) # IMPORT, UPDATE, DELETE
    target_type: Mapped[str] = mapped_column(String(50)) # PRICE, BUDGET
    target_id: Mapped[Optional[str]] = mapped_column(String(50))
    details: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    timestamp: Mapped[datetime] = mapped_column(default=func.now())

class UploadHistory(Base):
    """Tracks files stored in storage/imports"""
    __tablename__ = "upload_history"
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(255)) # relative to storage/imports
    file_size_bytes: Mapped[int] = mapped_column(Integer)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64)) # SHA256
    upload_date: Mapped[datetime] = mapped_column(default=func.now())
    status: Mapped[str] = mapped_column(String(20)) # PENDING, PROCESSED, ERROR

# --- Engineering Core (Phase 4/9) ---

class ReferenceSource(Base):
    __tablename__ = "reference_sources"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True) # SINAPI, SICRO, ORSE
    description: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Legacy/Required Fields present in DB
    state: Mapped[str] = mapped_column(String(2), default="BR")
    month: Mapped[int] = mapped_column(Integer, default=1)
    year: Mapped[int] = mapped_column(Integer, default=2024)
    type: Mapped[str] = mapped_column(String(20), default="SYNTHETIC")

class ReferenceItem(Base):
    __tablename__ = "reference_items"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id: Mapped[int] = mapped_column(ForeignKey("reference_sources.id"))
    code: Mapped[str] = mapped_column(String(20), index=True)
    description: Mapped[str] = mapped_column(Text) 
    unit: Mapped[str] = mapped_column(String(10))
    type: Mapped[str] = mapped_column(String(20)) # MATERIAL, LABOR, COMPOSITION, EQUIPMENT
    
    # SICRO Specifics (Phase 9)
    methodology: Mapped[str] = mapped_column(String(20), default="UNITARY") # UNITARY (SINAPI) or PRODUCTION (SICRO)
    
    # REGRA MAGNA: Imutabilidade de dados oficiais
    is_official: Mapped[bool] = mapped_column(Boolean, default=True)  # True = Base oficial (SINAPI/SICRO)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=True)    # True = Não pode ser editado
    
    source: Mapped["ReferenceSource"] = relationship(lazy="selectin")
    prices: Mapped[List["ReferencePrice"]] = relationship(back_populates="item", lazy="selectin")
    
    @property
    def source_name(self) -> str:
        """Retorna o nome da fonte (SINAPI, SICRO, etc.)"""
        return self.source.name if self.source else "N/A"

class ReferencePrice(Base):
    __tablename__ = "reference_prices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"), nullable=False, index=True)
    region: Mapped[Optional[str]] = mapped_column(String(50)) # State or Region
    price: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="BRL")
    date_validity: Mapped[Optional[date]] = mapped_column(Date, index=True)
    charge_type: Mapped[str] = mapped_column(String(20), default="DESONERADO") # DESONERADO, NAO_DESONERADO
    
    # Audit / Soft Delete (Phase 4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    inactivated_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    inactivated_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    
    item: Mapped["ReferenceItem"] = relationship(back_populates="prices", lazy="selectin")

# --- SICRO Methodology (Phase 9) ---

class SicroCompositionTeam(Base):
    """Defines the Team (Equipe) for a SICRO composition"""
    __tablename__ = "sicro_teams"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    composition_item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"))
    member_item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id")) # Labor or Equipment
    quantity: Mapped[Decimal] = mapped_column(DECIMAL(10, 4)) # Qty of officers to make the team

class SicroProductionRate(Base):
    """Production rate for a Team on a specific Service"""
    __tablename__ = "sicro_production_rates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"))
    production_hourly: Mapped[Decimal] = mapped_column(DECIMAL(10, 4)) # e.g. 100.00 m3/h
    unit: Mapped[str] = mapped_column(String(10)) # unit of production

class CompositionItem(Base):
    """Generic ingredient link (Parents -> Children)"""
    __tablename__ = "composition_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"))
    child_item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"))
    
    coefficient: Mapped[Decimal] = mapped_column(DECIMAL(10, 6)) # Qty essential
    price_source: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(15, 2)) # Snapshot price?

# --- Budgeting & Projects (Restored) ---

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restored_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    restored_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    # Ownership
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"))
    created_by_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    
    tenant: Mapped["Tenant"] = relationship()
    budgets: Mapped[List["ProjectBudget"]] = relationship(back_populates="project")

class ProjectBudget(Base):
    __tablename__ = "project_budgets"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"))

    name: Mapped[str] = mapped_column(String(100))
    reference_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT") # DRAFT, APPROVED
    total_value: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restored_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    restored_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="budgets", lazy="selectin")
    items: Mapped[List["BudgetItem"]] = relationship(back_populates="budget", lazy="selectin")
    bdi_config: Mapped[Optional["BDIConfiguration"]] = relationship(back_populates="budget", uselist=False, lazy="selectin")
    
    # Phase 2: Social Charges
    social_charges_type: Mapped[str] = mapped_column(String(20), default="DESONERADO") # DESONERADO, NAO_DESONERADO
    
    # Phase 12: Price Configuration
    price_region: Mapped[str] = mapped_column(String(2), default="RS")  # State code (RS, SP, RJ, etc.)
    price_month: Mapped[int] = mapped_column(Integer, default=1)  # 1-12
    price_year: Mapped[int] = mapped_column(Integer, default=2024)
    bdi_normal: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), default=25.0)  # BDI Normal %
    bdi_diferenciado: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), default=15.0)  # BDI Diferenciado %

class BDIConfiguration(Base):
    __tablename__ = "bdi_configurations"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[UUID] = mapped_column(ForeignKey("project_budgets.id"), unique=True)
    
    # Standard BDI Components
    administration_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0300) # 3.00%
    financial_expenses_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0059) # 0.59%
    insurance_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0080) # 0.80%
    risk_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0127) # 1.27%
    profit_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0740) # 7.40%
    
    # Taxes (PIS, COFINS, ISS, CPRB)
    pis_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0065) # 0.65%
    cofins_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0300) # 3.00%
    iss_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0500) # 5.00%
    cprb_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), default=0.0450) # 4.5% (only for Desonerado)
    
    # Calculated standard BDI
    total_bdi_services: Mapped[Decimal] = mapped_column(DECIMAL(5, 4)) # Calculated
    total_bdi_materials: Mapped[Decimal] = mapped_column(DECIMAL(5, 4)) # Usually lower
    total_bdi_equipment: Mapped[Decimal] = mapped_column(DECIMAL(5, 4)) # Different rate?
    
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=func.now())

    budget: Mapped["ProjectBudget"] = relationship(back_populates="bdi_config")

class BudgetItem(Base):
    __tablename__ = "budget_items"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id: Mapped[UUID] = mapped_column(ForeignKey("project_budgets.id"))
    
    # Link to Source (SINAPI/SICRO) or Custom
    reference_item_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("reference_items.id"))
    custom_code: Mapped[Optional[str]] = mapped_column(String(20))
    custom_description: Mapped[Optional[str]] = mapped_column(Text)
    
    quantity: Mapped[Decimal] = mapped_column(DECIMAL(10, 4))
    
    # Snapshotted values
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(15, 2))
    bdi_applied: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), default=0)
    bdi_type: Mapped[str] = mapped_column(String(15), default="NORMAL")  # NORMAL or DIFERENCIADO

    @property
    def total_price(self):
        from decimal import Decimal
        bdi = self.bdi_applied if self.bdi_applied is not None else Decimal('0')
        return self.quantity * self.unit_price * (1 + bdi / Decimal('100'))

    budget: Mapped["ProjectBudget"] = relationship(back_populates="items")
    reference_item: Mapped["ReferenceItem"] = relationship()

    # Phase 1: WBS / Hierarchy
    parent_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("budget_items.id"), nullable=True)
    numbering: Mapped[str] = mapped_column(String(50), default="") # e.g. "1.1", "1.2.3"
    item_type: Mapped[str] = mapped_column(String(20), default="ITEM") # CHAPTER, ITEM
    
    # Soft Delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deleted_by_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    # Phase 6: Schedule Link
    schedule_tasks: Mapped[List["PhysicalFinancialSchedule"]] = relationship(back_populates="budget_item")
    
    # Hierarchy relationship
    children: Mapped[List["BudgetItem"]] = relationship("BudgetItem", backref=backref("parent", remote_side=[id]))

class PhysicalFinancialSchedule(Base):
    __tablename__ = "physical_financial_schedules"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_item_id: Mapped[UUID] = mapped_column(ForeignKey("budget_items.id"))

    period: Mapped[date] = mapped_column(Date) # Month/Year of execution
    percentage: Mapped[Decimal] = mapped_column(DECIMAL(5, 2)) # e.g. 20.5%
    value_predicted: Mapped[Decimal] = mapped_column(DECIMAL(15, 2))

    budget_item: Mapped["BudgetItem"] = relationship(back_populates="schedule_tasks")

class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_item_id: Mapped[UUID] = mapped_column(ForeignKey("budget_items.id"))

    measurement_date: Mapped[date] = mapped_column(Date)
    quantity_measured: Mapped[Decimal] = mapped_column(DECIMAL(10, 4))
    value_measured: Mapped[Decimal] = mapped_column(DECIMAL(15, 2))

    # Link to a "Contractual Milestone" (Marco Contratual) - simplified as string or FK if needed
    milestone_name: Mapped[Optional[str]] = mapped_column(String(100))

class Memorial(Base):
    __tablename__ = "memorials"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    source_document: Mapped[Optional[str]] = mapped_column(String(255)) # URL or ref
    created_at: Mapped[datetime] = mapped_column(default=func.now())

class ItemMemorial(Base):
    """Link Reference Items to Memorials (Many-to-Many with attributes)"""
    __tablename__ = "item_memorials"
    
    item_id: Mapped[UUID] = mapped_column(ForeignKey("reference_items.id"), primary_key=True)
    memorial_id: Mapped[UUID] = mapped_column(ForeignKey("memorials.id"), primary_key=True)
    relevance_score: Mapped[int] = mapped_column(Integer, default=1)

# --- Composições Próprias (User Editable) ---

class CustomComposition(Base):
    """
    Composições próprias ou alteradas pelo usuário.
    
    REGRA MAGNA: Quando o usuário deseja editar uma composição de base oficial,
    uma CÓPIA é criada nesta tabela. O original permanece IMUTÁVEL.
    
    A fonte será sempre "PRÓPRIA" e o código será diferente do original.
    """
    __tablename__ = "custom_compositions"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Multi-tenant
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"))
    
    # Referência à composição original (opcional - para rastreabilidade)
    original_item_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("reference_items.id"), nullable=True)
    
    # Dados da composição
    code: Mapped[str] = mapped_column(String(30), index=True)  # Ex: "PROP-001"
    description: Mapped[str] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(20))
    type: Mapped[str] = mapped_column(String(20), default="COMPOSITION")  # COMPOSITION, MATERIAL, etc.
    
    # Fonte é sempre "PRÓPRIA"
    source_name: Mapped[str] = mapped_column(String(50), default="PRÓPRIA")
    
    # Preço calculado ou manual
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(15, 2), default=0)
    
    # Audit
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    created_by_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=func.now())
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship()
    original_item: Mapped[Optional["ReferenceItem"]] = relationship()
    created_by: Mapped["User"] = relationship()
    items: Mapped[List["CustomCompositionItem"]] = relationship(back_populates="composition")

class CustomCompositionItem(Base):
    """Itens dentro de uma composição própria"""
    __tablename__ = "custom_composition_items"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    composition_id: Mapped[UUID] = mapped_column(ForeignKey("custom_compositions.id"))
    
    # Pode referenciar um item oficial ou ser totalmente customizado
    reference_item_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("reference_items.id"), nullable=True)
    custom_code: Mapped[Optional[str]] = mapped_column(String(30))
    custom_description: Mapped[Optional[str]] = mapped_column(Text)
    
    unit: Mapped[str] = mapped_column(String(20))
    coefficient: Mapped[Decimal] = mapped_column(DECIMAL(15, 6))  # Coeficiente/quantidade
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(15, 2))
    
    composition: Mapped["CustomComposition"] = relationship(back_populates="items")
    reference_item: Mapped[Optional["ReferenceItem"]] = relationship()
