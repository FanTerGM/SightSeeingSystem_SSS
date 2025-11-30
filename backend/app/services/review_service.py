"""
Review Service

Service class for managing location reviews.
"""

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
import uuid

from app.models import Review, Location, User
from .base_service import BaseService


class ReviewService(BaseService[Review]):
    """
    Service class for Review operations.
    
    Handles review creation, updates, and statistics.
    Note: Location ratings are automatically updated via database trigger.
    """
    
    def __init__(self, db: Session):
        """Initialize ReviewService with database session."""
        super().__init__(Review, db)
    
    def create_review(
        self,
        user_id: uuid.UUID,
        location_id: uuid.UUID,
        rating: int,
        comment: Optional[str] = None,
        visit_date: Optional[date] = None
    ) -> Optional[Review]:
        """
        Create a new review.
        
        Args:
            user_id: User UUID
            location_id: Location UUID
            rating: Rating (1-5)
            comment: Optional review text
            visit_date: Optional visit date
            
        Returns:
            Created Review instance or None if failed
            
        Example:
            review = service.create_review(
                user_id=user_id,
                location_id=location_id,
                rating=5,
                comment="Amazing place!",
                visit_date=date(2024, 11, 20)
            )
        """
        # Validate rating
        if rating < 1 or rating > 5:
            print("Rating must be between 1 and 5")
            return None
        
        # Check if user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"User {user_id} not found")
            return None
        
        # Check if location exists
        location = self.db.query(Location).filter(Location.id == location_id).first()
        if not location:
            print(f"Location {location_id} not found")
            return None
        
        # Check if user already reviewed this location
        existing_review = self.get_user_review(user_id, location_id)
        if existing_review:
            print(f"User already reviewed this location")
            return None
        
        # Create review (trigger will auto-update location rating)
        return self.create(
            user_id=user_id,
            location_id=location_id,
            rating=rating,
            comment=comment,
            visit_date=visit_date
        )
    
    def get_user_review(
        self,
        user_id: uuid.UUID,
        location_id: uuid.UUID
    ) -> Optional[Review]:
        """
        Get a user's review for a specific location.
        
        Args:
            user_id: User UUID
            location_id: Location UUID
            
        Returns:
            Review instance or None if not found
            
        Example:
            review = service.get_user_review(user_id, location_id)
            if review:
                print(f"Rating: {review.rating}/5")
        """
        try:
            return self.db.query(Review).filter(
                Review.user_id == user_id,
                Review.location_id == location_id
            ).first()
        except Exception as e:
            print(f"Error getting user review: {e}")
            return None
    
    def update_review(
        self,
        review_id: uuid.UUID,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        visit_date: Optional[date] = None
    ) -> Optional[Review]:
        """
        Update an existing review.
        
        Args:
            review_id: Review UUID
            rating: New rating (1-5)
            comment: New comment
            visit_date: New visit date
            
        Returns:
            Updated Review instance or None if failed
            
        Example:
            updated = service.update_review(
                review_id=review_id,
                rating=4,
                comment="Updated review"
            )
        """
        if rating is not None and (rating < 1 or rating > 5):
            print("Rating must be between 1 and 5")
            return None
        
        update_data = {}
        if rating is not None:
            update_data['rating'] = rating
        if comment is not None:
            update_data['comment'] = comment
        if visit_date is not None:
            update_data['visit_date'] = visit_date
        
        return self.update(review_id, **update_data)
    
    def get_location_reviews(
        self,
        location_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = 'recent'  # 'recent', 'rating_high', 'rating_low'
    ) -> List[Review]:
        """
        Get all reviews for a location.
        
        Args:
            location_id: Location UUID
            skip: Pagination skip
            limit: Pagination limit
            sort_by: Sort order ('recent', 'rating_high', 'rating_low')
            
        Returns:
            List of Review instances
            
        Example:
            reviews = service.get_location_reviews(
                location_id=location_id,
                sort_by='rating_high',
                limit=10
            )
        """
        try:
            query = self.db.query(Review).filter(
                Review.location_id == location_id
            )
            
            # Sort
            if sort_by == 'recent':
                query = query.order_by(Review.created_at.desc())
            elif sort_by == 'rating_high':
                query = query.order_by(Review.rating.desc())
            elif sort_by == 'rating_low':
                query = query.order_by(Review.rating.asc())
            
            return query.offset(skip).limit(limit).all()
        except Exception as e:
            print(f"Error getting location reviews: {e}")
            return []
    
    def get_user_reviews(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Review]:
        """
        Get all reviews by a user.
        
        Args:
            user_id: User UUID
            skip: Pagination skip
            limit: Pagination limit
            
        Returns:
            List of Review instances
            
        Example:
            reviews = service.get_user_reviews(user_id)
        """
        try:
            return self.db.query(Review).filter(
                Review.user_id == user_id
            ).order_by(
                Review.created_at.desc()
            ).offset(skip).limit(limit).all()
        except Exception as e:
            print(f"Error getting user reviews: {e}")
            return []
    
    def get_review_statistics(self, location_id: uuid.UUID) -> Dict:
        """
        Get detailed review statistics for a location.
        
        Args:
            location_id: Location UUID
            
        Returns:
            Dictionary with statistics
            
        Example:
            stats = service.get_review_statistics(location_id)
            print(f"Average: {stats['average_rating']}")
            print(f"Distribution: {stats['rating_distribution']}")
        """
        try:
            reviews = self.db.query(Review).filter(
                Review.location_id == location_id
            ).all()
            
            if not reviews:
                return {
                    'total_reviews': 0,
                    'average_rating': 0,
                    'rating_distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
                }
            
            # Calculate distribution
            distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            total_rating = 0
            
            for review in reviews:
                distribution[review.rating] += 1
                total_rating += review.rating
            
            return {
                'total_reviews': len(reviews),
                'average_rating': round(total_rating / len(reviews), 2),
                'rating_distribution': distribution,
                'percentage_distribution': {
                    rating: round((count / len(reviews)) * 100, 1)
                    for rating, count in distribution.items()
                }
            }
        except Exception as e:
            print(f"Error getting review statistics: {e}")
            return {}
    
    def get_top_reviewers(self, limit: int = 10) -> List[Dict]:
        """
        Get users with most reviews.
        
        Args:
            limit: Maximum results
            
        Returns:
            List of dictionaries with user info and review count
            
        Example:
            top_reviewers = service.get_top_reviewers(limit=5)
            for reviewer in top_reviewers:
                print(f"{reviewer['full_name']}: {reviewer['review_count']} reviews")
        """
        try:
            result = self.db.query(
                User.id,
                User.full_name,
                User.email,
                func.count(Review.id).label('review_count')
            ).join(Review).group_by(
                User.id, User.full_name, User.email
            ).order_by(
                func.count(Review.id).desc()
            ).limit(limit).all()
            
            return [
                {
                    'user_id': str(row.id),
                    'full_name': row.full_name,
                    'email': row.email,
                    'review_count': row.review_count
                }
                for row in result
            ]
        except Exception as e:
            print(f"Error getting top reviewers: {e}")
            return []
    
    def get_recent_reviews(self, limit: int = 10) -> List[Review]:
        """
        Get most recent reviews across all locations.
        
        Args:
            limit: Maximum results
            
        Returns:
            List of recent reviews
            
        Example:
            recent = service.get_recent_reviews(limit=5)
        """
        try:
            return self.db.query(Review).order_by(
                Review.created_at.desc()
            ).limit(limit).all()
        except Exception as e:
            print(f"Error getting recent reviews: {e}")
            return []
