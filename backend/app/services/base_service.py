"""
Base Service Class

Provides common CRUD operations for all service classes.
"""

from typing import List, Optional, TypeVar, Generic, Type
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import uuid

T = TypeVar('T')  # Generic type for model


class BaseService(Generic[T]):
    """
    Base service class with common CRUD operations.
    
    Attributes:
        model: SQLAlchemy model class
        db: Database session
    """
    
    def __init__(self, model: Type[T], db: Session):
        """
        Initialize base service.
        
        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db
    
    def create(self, **kwargs) -> Optional[T]:
        """
        Create a new instance.
        
        Args:
            **kwargs: Fields for the new instance
            
        Returns:
            Created instance or None if failed
            
        Example:
            user = service.create(email="test@example.com", full_name="Test User")
        """
        try:
            instance = self.model(**kwargs)
            self.db.add(instance)
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except IntegrityError as e:
            self.db.rollback()
            print(f"Integrity Error: {e}")
            return None
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"Database Error: {e}")
            return None
    
    def get_by_id(self, id: uuid.UUID) -> Optional[T]:
        """
        Get instance by ID.
        
        Args:
            id: UUID of the instance
            
        Returns:
            Instance or None if not found
            
        Example:
            user = service.get_by_id(user_id)
        """
        try:
            return self.db.query(self.model).filter(self.model.id == id).first()
        except SQLAlchemyError as e:
            print(f"Database Error: {e}")
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """
        Get all instances with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of instances
            
        Example:
            users = service.get_all(skip=0, limit=10)
        """
        try:
            return self.db.query(self.model).offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            print(f"Database Error: {e}")
            return []
    
    def update(self, id: uuid.UUID, **kwargs) -> Optional[T]:
        """
        Update an instance.
        
        Args:
            id: UUID of the instance
            **kwargs: Fields to update
            
        Returns:
            Updated instance or None if failed
            
        Example:
            updated_user = service.update(user_id, full_name="New Name")
        """
        try:
            instance = self.get_by_id(id)
            if not instance:
                return None
            
            for key, value in kwargs.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            
            self.db.commit()
            self.db.refresh(instance)
            return instance
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"Database Error: {e}")
            return None
    
    def delete(self, id: uuid.UUID) -> bool:
        """
        Delete an instance.
        
        Args:
            id: UUID of the instance
            
        Returns:
            True if deleted, False otherwise
            
        Example:
            success = service.delete(user_id)
        """
        try:
            instance = self.get_by_id(id)
            if not instance:
                return False
            
            self.db.delete(instance)
            self.db.commit()
            return True
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"Database Error: {e}")
            return False
    
    def count(self) -> int:
        """
        Count total instances.
        
        Returns:
            Total count
            
        Example:
            total = service.count()
        """
        try:
            return self.db.query(self.model).count()
        except SQLAlchemyError as e:
            print(f"Database Error: {e}")
            return 0
    
    def exists(self, id: uuid.UUID) -> bool:
        """
        Check if instance exists.
        
        Args:
            id: UUID of the instance
            
        Returns:
            True if exists, False otherwise
            
        Example:
            if service.exists(user_id):
                print("User exists")
        """
        return self.get_by_id(id) is not None
