from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import select
from typing import Type, List, Optional
from models import (
    BudgetItem, ReferenceItem, ReferenceSource, ReferencePrice,
    ProjectBudget, Project, User, Tenant
)

class EagerLoading:
    """
    Utilitário para carregamento eager de relacionamentos comuns
    para evitar problemas de consultas N+1
    """
    
    @staticmethod
    def budget_item_with_reference():
        """Carrega BudgetItem com ReferenceItem e seus relacionamentos"""
        return selectinload(BudgetItem.reference_item).selectinload(ReferenceItem.source)
    
    @staticmethod
    def budget_item_full():
        """Carrega BudgetItem com todos os relacionamentos principais"""
        return selectinload(BudgetItem.reference_item).selectinload(ReferenceItem.source)
    
    @staticmethod
    def reference_item_with_source():
        """Carrega ReferenceItem com Source"""
        return selectinload(ReferenceItem.source)
    
    @staticmethod
    def reference_item_full():
        """Carrega ReferenceItem com Source e Prices"""
        return (
            selectinload(ReferenceItem.source)
            .selectinload(ReferenceItem.prices)
        )
    
    @staticmethod
    def project_with_budgets():
        """Carrega Project com Budgets"""
        return selectinload(Project.budgets)
    
    @staticmethod
    def budget_with_items():
        """Carrega ProjectBudget com Items"""
        return selectinload(ProjectBudget.items)
    
    @staticmethod
    def budget_with_items_and_reference():
        """Carrega ProjectBudget com Items e ReferenceItem completo"""
        return (
            selectinload(ProjectBudget.items)
            .selectinload(BudgetItem.reference_item)
            .selectinload(ReferenceItem.source)
        )
    
    @staticmethod
    def user_with_tenant():
        """Carrega User com Tenant"""
        return selectinload(User.tenant)

def eager_load_budget_items(query):
    """
    Aplica eager loading otimizado para consultas de BudgetItem
    """
    return query.options(
        selectinload(BudgetItem.reference_item).selectinload(ReferenceItem.source)
    )

def eager_load_reference_items(query):
    """
    Aplica eager loading otimizado para consultas de ReferenceItem
    """
    return query.options(
        selectinload(ReferenceItem.source),
        selectinload(ReferenceItem.prices)
    )

def eager_load_projects_with_budgets(query):
    """
    Aplica eager loading otimizado para consultas de Project com Budgets
    """
    return query.options(
        selectinload(Project.budgets)
    )

def eager_load_budgets_with_items(query):
    """
    Aplica eager loading otimizado para consultas de ProjectBudget com Items
    """
    return query.options(
        selectinload(ProjectBudget.items)
        .selectinload(BudgetItem.reference_item)
        .selectinload(ReferenceItem.source)
    )