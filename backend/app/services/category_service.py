"""
Category Service

Service class for managing location categories.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
import uuid

from app.models import Category, LocationCategory, Location
from .base_service import BaseService


class CategoryService(BaseService[Category]):
    """
    Service class for Category operations.
    
    Handles category management and category-location relationships.
    """
    
    def __init__(self, db: Session):
        """Initialize CategoryService with database session."""
        super().__init__(Category, db)
    
    def create_category(
        self,
        name: str,
        name_vi: str,
        icon: Optional[str] = None
    ) -> Optional[Category]:
        """
        Create a new category.
        
        Args:
            name: English name (unique)
            name_vi: Vietnamese name
            icon: Optional icon identifier
            
        Returns:
            Created Category instance or None if name already exists
            
        Example:
            category = service.create_category(
                name="museum",
                name_vi="Bảo tàng",
                icon="museum_icon"
            )
        """
        # Check if name already exists
        existing = self.get_by_name(name)
        if existing:
            print(f"Category '{name}' already exists")
            return None
        
        return self.create(name=name, name_vi=name_vi, icon=icon)
    
    def get_by_name(self, name: str) -> Optional[Category]:
        """
        Get category by name.
        
        Args:
            name: Category name
            
        Returns:
            Category instance or None if not found
            
        Example:
            category = service.get_by_name("museum")
        """
        try:
            return self.db.query(Category).filter(Category.name == name).first()
        except Exception as e:
            print(f"Error getting category by name: {e}")
            return None
    
    def get_locations_by_category(
        self,
        category_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """
        Get all locations in a specific category.
        
        Args:
            category_id: Category UUID
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of Location instances
            
        Example:
            locations = service.get_locations_by_category(
                category_id=museum_category_id,
                limit=10
            )
        """
        try:
            return self.db.query(Location).join(
                LocationCategory
            ).filter(
                LocationCategory.category_id == category_id,
                Location.is_active == True
            ).offset(skip).limit(limit).all()
        except Exception as e:
            print(f"Error getting locations by category: {e}")
            return []
    
    def count_locations_by_category(self, category_id: uuid.UUID) -> int:
        """
        Count locations in a category.
        
        Args:
            category_id: Category UUID
            
        Returns:
            Number of locations
            
        Example:
            count = service.count_locations_by_category(category_id)
            print(f"Found {count} locations")
        """
        try:
            return self.db.query(Location).join(
                LocationCategory
            ).filter(
                LocationCategory.category_id == category_id,
                Location.is_active == True
            ).count()
        except Exception as e:
            print(f"Error counting locations: {e}")
            return 0
    
    def get_all_with_counts(self) -> List[dict]:
        """
        Get all categories with location counts.
        
        Returns:
            List of dictionaries with category and location count
            
        Example:
            categories = service.get_all_with_counts()
            for cat in categories:
                print(f"{cat['name_vi']}: {cat['location_count']} locations")
        """
        try:
            categories = self.get_all()
            result = []
            
            for category in categories:
                count = self.count_locations_by_category(category.id)
                result.append({
                    'id': category.id,
                    'name': category.name,
                    'name_vi': category.name_vi,
                    'icon': category.icon,
                    'location_count': count
                })
            
            return result
        except Exception as e:
            print(f"Error getting categories with counts: {e}")
            return []
    
    def search_categories(self, query: str) -> List[Category]:
        """
        Search categories by name (English or Vietnamese).
        
        Args:
            query: Search query
            
        Returns:
            List of matching categories
            
        Example:
            categories = service.search_categories("museum")
        """
        try:
            return self.db.query(Category).filter(
                (Category.name.ilike(f"%{query}%")) |
                (Category.name_vi.ilike(f"%{query}%"))
            ).all()
        except Exception as e:
            print(f"Error searching categories: {e}")
            return []
