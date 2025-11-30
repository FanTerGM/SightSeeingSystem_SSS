"""
User Service

Service class for managing users and user preferences.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid

from app.models import User, UserPreference, Review, Location
from .base_service import BaseService


class UserService(BaseService[User]):
    """
    Service class for User operations.
    
    Handles user creation, retrieval, updates, and preference management.
    """

    def __init__(self, db: Session):
        """Initialize UserService with database session."""
        super().__init__(User, db)

    def create_user(
        self,
        email: str,
        full_name: str,
        phone_number: Optional[str] = None
    ) -> Optional[User]:
        """
        Create a new user.
        
        Args:
            email: User's email (unique)
            full_name: User's full name
            phone_number: Optional phone number
            
        Returns:
            Created User instance or None if email already exists
            
        Example:
            user = service.create_user(
                email="john@example.com",
                full_name="John Doe",
                phone_number="+84901234567"
            )
        """
        # Check if email already exists
        existing_user = self.get_by_email(email)
        if existing_user:
            print(f"Email {email} already exists")
            return None

        return self.create(
            email=email,
            full_name=full_name,
            phone_number=phone_number
        )

    def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            email: User's email
            
        Returns:
            User instance or None if not found
            
        Example:
            user = service.get_by_email("john@example.com")
        """
        try:
            return self.db.query(User).filter(User.email == email).first()
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    def update_user(
        self,
        user_id: uuid.UUID,
        full_name: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> Optional[User]:
        """
        Update user information.
        
        Args:
            user_id: User's UUID
            full_name: New full name (optional)
            phone_number: New phone number (optional)
            
        Returns:
            Updated User instance or None if failed
            
        Example:
            updated_user = service.update_user(
                user_id=user_id,
                full_name="John Smith",
                phone_number="+84987654321"
            )
        """
        update_data = {}
        if full_name is not None:
            update_data['full_name'] = full_name
        if phone_number is not None:
            update_data['phone_number'] = phone_number

        return self.update(user_id, **update_data)

    def set_preferences(
        self,
        user_id: uuid.UUID,
        budget_level: Optional[str] = None,
        preferred_categories: Optional[List[uuid.UUID]] = None,
        travel_pace: Optional[str] = None
    ) -> Optional[UserPreference]:
        """
        Set or update user preferences.
        
        Args:
            user_id: User's UUID
            budget_level: 'low', 'medium', or 'high'
            preferred_categories: List of category UUIDs
            travel_pace: 'slow', 'moderate', or 'fast'
            
        Returns:
            UserPreference instance or None if failed
            
        Example:
            pref = service.set_preferences(
                user_id=user_id,
                budget_level="medium",
                preferred_categories=[cat1_id, cat2_id],
                travel_pace="moderate"
            )
        """
        try:
            # Check if preferences already exist
            existing_pref = self.db.query(UserPreference).filter(
                UserPreference.user_id == user_id
            ).first()

            if existing_pref:
                # Update existing preferences
                if budget_level is not None:
                    existing_pref.budget_level = budget_level
                if preferred_categories is not None:
                    existing_pref.preferred_categories = preferred_categories
                if travel_pace is not None:
                    existing_pref.travel_pace = travel_pace

                self.db.commit()
                self.db.refresh(existing_pref)
                return existing_pref
            else:
                # Create new preferences
                new_pref = UserPreference(
                    user_id=user_id,
                    budget_level=budget_level,
                    preferred_categories=preferred_categories,
                    travel_pace=travel_pace
                )
                self.db.add(new_pref)
                self.db.commit()
                self.db.refresh(new_pref)
                return new_pref
        except Exception as e:
            self.db.rollback()
            print(f"Error setting preferences: {e}")
            return None

    def get_preferences(self, user_id: uuid.UUID) -> Optional[UserPreference]:
        """
        Get user preferences.
        
        Args:
            user_id: User's UUID
            
        Returns:
            UserPreference instance or None if not found
            
        Example:
            pref = service.get_preferences(user_id)
            if pref:
                print(f"Budget level: {pref.budget_level}")
        """
        try:
            return self.db.query(UserPreference).filter(
                UserPreference.user_id == user_id
            ).first()
        except Exception as e:
            print(f"Error getting preferences: {e}")
            return None

    def get_user_with_preferences(self, user_id: uuid.UUID) -> Optional[dict]:
        """
        Get user with their preferences in one call.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Dictionary with user and preferences data
            
        Example:
            data = service.get_user_with_preferences(user_id)
            print(f"User: {data['user'].full_name}")
            print(f"Budget: {data['preferences'].budget_level}")
        """
        user = self.get_by_id(user_id)
        if not user:
            return None

        preferences = self.get_preferences(user_id)

        return {
            'user': user,
            'preferences': preferences
        }

    def search_users(self, query: str, limit: int = 10) -> List[User]:
        """
        Search users by name or email.
        
        Args:
            query: Search query string
            limit: Maximum results
            
        Returns:
            List of matching users
            
        Example:
            users = service.search_users("john")
        """
        try:
            return self.db.query(User).filter(
                (User.full_name.ilike(f"%{query}%")) |
                (User.email.ilike(f"%{query}%"))
            ).limit(limit).all()
        except Exception as e:
            print(f"Error searching users: {e}")
            return []


    def get_user_with_history(self, user_id):
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None

            # History: list of reviews with location details
            reviews = (
                self.db.query(Review)
                .join(Location, Review.location_id == Location.id)
                .filter(Review.user_id == user_id)
                .all()
            )

            history = []
            for r in reviews:
                history.append({
                    "location_id": str(r.location_id),
                    "rating": r.rating,
                    "categories": [str(c.category_id) for c in r.location.categories],
                    "district": r.location.district,
                    "price_level": r.location.price_level
                })

            return {
                "id": str(user.id),
                "email": user.email,
                "history": history
            }

        except Exception as e:
            print("Error in get_user_with_history:", e)
            return None
