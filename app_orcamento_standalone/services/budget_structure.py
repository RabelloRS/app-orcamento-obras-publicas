from typing import List, Dict, Any
from uuid import UUID
from decimal import Decimal
from models import BudgetItem

def build_budget_hierarchy(items: List[BudgetItem]) -> List[Dict[str, Any]]:
    """
    Organizes flat list of budget items into a hierarchy based on parent_id.
    Calculates totals for Chapters (items with children).
    """
    # 1. Create a map for easy lookup
    item_map = {item.id: item for item in items}
    children_map: Dict[UUID, List[BudgetItem]] = {}
    
    # 2. Group by parent
    roots = []
    for item in items:
        if item.parent_id:
            if item.parent_id not in children_map:
                children_map[item.parent_id] = []
            children_map[item.parent_id].append(item)
        else:
            roots.append(item)
            
    # 3. Recursive build
    def build_node(item: BudgetItem) -> Dict[str, Any]:
        node = {
            "id": item.id,
            "code": item.custom_code or (item.reference_item.code if item.reference_item else ""),
            "description": item.custom_description or (item.reference_item.description if item.reference_item else ""),
            "unit": item.reference_item.unit if item.reference_item else "UN",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
            "type": item.item_type,
            "numbering": item.numbering,
            "children": []
        }
        
        children = children_map.get(item.id, [])
        children_sum = Decimal(0)
        
        # Sort children by numbering or creation? Numbering is better but might be empty.
        # Fallback to created_at or id if numbering not present (logic specific to implementation)
        # For now, sort by numbering string (simple lexicographical)
        children.sort(key=lambda x: x.numbering or "")
        
        for child in children:
            child_node = build_node(child)
            node["children"].append(child_node)
            children_sum += child_node["total_price"]
            
        # If it's a CHAPTER, override total_price with sum of children
        if item.item_type == "CHAPTER" or children: # Or implicit if has children
            node["total_price"] = children_sum
            # Optionally override unit price/quantity logic for chapters?
            # Usually Chapter Quantity = 1, Unit Price = Total.
            node["unit_price"] = children_sum
            node["quantity"] = Decimal(1)
            
        return node

    # Sort roots
    roots.sort(key=lambda x: x.numbering or "")
    
    hierarchy = [build_node(root) for root in roots]
    return hierarchy

def renumber_items(items: List[BudgetItem]) -> Dict[UUID, str]:
    """
    Returns a dictionary mapping item_id -> new_numbering_string.
    Does NOT update DB directly, returns the map for bulk update.
    """
    # Group by parent
    children_map: Dict[UUID, List[BudgetItem]] = {}
    roots = []
    
    for item in items:
        if item.parent_id:
            if item.parent_id not in children_map:
                children_map[item.parent_id] = []
            children_map[item.parent_id].append(item)
        else:
            roots.append(item)

    updates = {}
    
    def process_node(items_list, prefix=""):
        # Sort by existing numbering or created_at
        # Try to respect existing integer order if possible, else creation
        items_list.sort(key=lambda x: (x.numbering or "", x.created_at or "")) # Simple default
        
        for idx, item in enumerate(items_list, 1):
            num = f"{prefix}{idx}" if not prefix else f"{prefix}.{idx}"
            updates[item.id] = num
            
            # Process children
            if item.id in children_map:
                process_node(children_map[item.id], num)
                
    process_node(roots)
    return updates
