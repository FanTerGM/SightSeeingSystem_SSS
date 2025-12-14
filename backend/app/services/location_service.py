"""
Location Service

Service class for managing locations with advanced search and filtering.
"""

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import uuid
import math

from app.models import Location, LocationCategory, Category, Review
from .base_service import BaseService


class LocationService(BaseService[Location]):
    """
    Service class for Location operations.
    
    Handles location CRUD, search, filtering, and geospatial queries.
    """
    
    def __init__(self, db: Session):
        """Initialize LocationService with database session."""
        super().__init__(Location, db)
    
    def create_location(
        self,
        name: str,
        name_vi: str,
        address: str,
        latitude: float,
        longitude: float,
        description: Optional[str] = None,
        district: Optional[str] = None,
        phone_number: Optional[str] = None,
        website: Optional[str] = None,
        price_level: Optional[str] = "₫₫",
        average_visit_duration: Optional[int] = 60,
        opening_hours: Optional[dict] = None,
        closing_hours: Optional[dict] = None,
        category_ids: Optional[List[uuid.UUID]] = None
    ) -> Optional[Location]:
        """
        Create a new location with categories.
        
        Args:
            name: English name
            name_vi: Vietnamese name
            address: Full address
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            description: Location description
            district: District name
            phone_number: Contact phone
            website: Website URL
            price_level: 'free', '₫', '₫₫', or '₫₫₫'
            average_visit_duration: Average minutes to visit
            opening_hours: Dict of opening hours
            closing_hours: Dict of closing hours
            category_ids: List of category UUIDs
            
        Returns:
            Created Location instance or None if failed
            
        Example:
            location = service.create_location(
                name="War Remnants Museum",
                name_vi="Bảo tàng Chứng tích Chiến tranh",
                address="28 Võ Văn Tần, Q.3",
                latitude=10.7797,
                longitude=106.6918,
                price_level="₫",
                category_ids=[museum_category_id]
            )
        """
        try:
            # Create location
            location = self.create(
                name=name,
                name_vi=name_vi,
                address=address,
                latitude=latitude,
                longitude=longitude,
                description=description,
                district=district,
                phone_number=phone_number,
                website=website,
                price_level=price_level,
                average_visit_duration=average_visit_duration,
                opening_hours=opening_hours,
                closing_hours=closing_hours
            )
            
            if not location:
                return None
            
            # Add categories
            if category_ids:
                for category_id in category_ids:
                    self.add_category(location.id, category_id)
            
            return location
        except Exception as e:
            print(f"Error creating location: {e}")
            return None
    
    def add_category(
        self,
        location_id: uuid.UUID,
        category_id: uuid.UUID
    ) -> bool:
        """
        Add a category to a location.
        
        Args:
            location_id: Location UUID
            category_id: Category UUID
            
        Returns:
            True if successful, False otherwise
            
        Example:
            success = service.add_category(location_id, cafe_category_id)
        """
        try:
            # Check if relationship already exists
            existing = self.db.query(LocationCategory).filter(
                LocationCategory.location_id == location_id,
                LocationCategory.category_id == category_id
            ).first()
            
            if existing:
                return True
            
            # Create new relationship
            loc_cat = LocationCategory(
                location_id=location_id,
                category_id=category_id
            )
            self.db.add(loc_cat)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error adding category: {e}")
            return False
    
    def remove_category(
        self,
        location_id: uuid.UUID,
        category_id: uuid.UUID
    ) -> bool:
        """
        Remove a category from a location.
        
        Args:
            location_id: Location UUID
            category_id: Category UUID
            
        Returns:
            True if removed, False otherwise
        """
        try:
            loc_cat = self.db.query(LocationCategory).filter(
                LocationCategory.location_id == location_id,
                LocationCategory.category_id == category_id
            ).first()
            
            if loc_cat:
                self.db.delete(loc_cat)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            print(f"Error removing category: {e}")
            return False
    
    def get_location_categories(self, location_id: uuid.UUID) -> List[Category]:
        """
        Get all categories for a location.
        
        Args:
            location_id: Location UUID
            
        Returns:
            List of Category instances
            
        Example:
            categories = service.get_location_categories(location_id)
            for cat in categories:
                print(cat.name_vi)
        """
        try:
            return self.db.query(Category).join(
                LocationCategory
            ).filter(
                LocationCategory.location_id == location_id
            ).all()
        except Exception as e:
            print(f"Error getting location categories: {e}")
            return []
    
    def search_locations(
        self,
        query: Optional[str] = None,
        district: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_rating: Optional[float] = None,
        price_level: Optional[str] = None,
        category_ids: Optional[List[uuid.UUID]] = None,
        is_active: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> List[Location]:
        """
        Advanced location search with multiple filters.
        
        Args:
            query: Search text (name or description)
            district: District filter
            min_rating: Minimum rating
            max_rating: Maximum rating
            price_level: Price level filter
            category_ids: List of category UUIDs
            is_active: Only active locations
            skip: Pagination skip
            limit: Pagination limit
            
        Returns:
            List of matching locations
            
        Example:
            locations = service.search_locations(
                query="museum",
                district="Quận 1",
                min_rating=4.0,
                price_level="₫",
                category_ids=[museum_cat_id]
            )
        """
        try:
            filters = []
            
            # Active status filter
            if is_active:
                filters.append(Location.is_active == True)
            
            # Text search
            if query:
                filters.append(
                    or_(
                        Location.name.ilike(f"%{query}%"),
                        Location.name_vi.ilike(f"%{query}%"),
                        Location.description.ilike(f"%{query}%")
                    )
                )
            
            # District filter
            if district:
                filters.append(Location.district == district)
            
            # Rating filters
            if min_rating is not None:
                filters.append(Location.rating >= min_rating)
            if max_rating is not None:
                filters.append(Location.rating <= max_rating)
            
            # Price level filter
            if price_level:
                filters.append(Location.price_level == price_level)
            
            # Base query
            query_obj = self.db.query(Location)
            
            # Category filter
            if category_ids:
                query_obj = query_obj.join(LocationCategory).filter(
                    LocationCategory.category_id.in_(category_ids)
                )
            
            # Apply all filters
            if filters:
                query_obj = query_obj.filter(and_(*filters))
            
            # Pagination
            return query_obj.offset(skip).limit(limit).all()
            
        except Exception as e:
            print(f"Error searching locations: {e}")
            return []
    
    def find_nearby(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        limit: int = 20,
        category_ids: Optional[List[uuid.UUID]] = None,
        min_rating: Optional[float] = None
    ) -> List[Dict]:
        """
        Find locations within a radius using Haversine formula.
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius_km: Search radius in kilometers
            limit: Maximum results
            category_ids: Filter by categories
            min_rating: Minimum rating filter
            
        Returns:
            List of dictionaries with location and distance
            
        Example:
            nearby = service.find_nearby(
                latitude=10.7720,
                longitude=106.6981,
                radius_km=2.0,
                min_rating=4.0
            )
            for loc in nearby:
                print(f"{loc['name_vi']} - {loc['distance_km']}km")
        """
        try:
            # Haversine formula SQL
            haversine = f"""
                (6371 * acos(
                    cos(radians({latitude})) *
                    cos(radians(latitude)) *
                    cos(radians(longitude) - radians({longitude})) +
                    sin(radians({latitude})) *
                    sin(radians(latitude))
                ))
            """
            
            # Base query
            query = f"""
                SELECT 
                    id, name, name_vi, address, district,
                    latitude, longitude, rating, price_level,
                    average_visit_duration, review_count,
                    {haversine} AS distance
                FROM locations
                WHERE is_active = true
            """
            
            # Add filters
            if min_rating:
                query += f" AND rating >= {min_rating}"
            
            # Category filter (requires join)
            if category_ids:
                cat_ids_str = "','".join([str(cid) for cid in category_ids])
                query += f"""
                    AND id IN (
                        SELECT location_id FROM location_categories
                        WHERE category_id IN ('{cat_ids_str}')
                    )
                """
            
            query += f"""
                HAVING distance < {radius_km}
                ORDER BY distance
                LIMIT {limit}
            """
            
            result = self.db.execute(query)
            
            locations = []
            for row in result:
                locations.append({
                    'id': str(row.id),
                    'name': row.name,
                    'name_vi': row.name_vi,
                    'address': row.address,
                    'district': row.district,
                    'latitude': float(row.latitude),
                    'longitude': float(row.longitude),
                    'rating': float(row.rating) if row.rating else None,
                    'price_level': row.price_level,
                    'average_visit_duration': row.average_visit_duration,
                    'review_count': row.review_count,
                    'distance_km': round(float(row.distance), 2)
                })
            
            return locations
            
        except Exception as e:
            print(f"Error finding nearby locations: {e}")
            return []
    
    def get_popular_locations(
        self,
        min_rating: float = 4.0,
        min_reviews: int = 5,
        limit: int = 20
    ) -> List[Location]:
        """
        Get popular locations (high rating + many reviews).
        
        Args:
            min_rating: Minimum rating threshold
            min_reviews: Minimum number of reviews
            limit: Maximum results
            
        Returns:
            List of popular locations
            
        Example:
            popular = service.get_popular_locations(min_rating=4.5)
        """
        try:
            return self.db.query(Location).filter(
                Location.is_active == True,
                Location.rating >= min_rating,
                Location.review_count >= min_reviews
            ).order_by(
                Location.rating.desc(),
                Location.review_count.desc()
            ).limit(limit).all()
        except Exception as e:
            print(f"Error getting popular locations: {e}")
            return []
    
    def get_statistics(self, location_id: uuid.UUID) -> Dict:
        """
        Get detailed statistics for a location.
        
        Args:
            location_id: Location UUID
            
        Returns:
            Dictionary with statistics
            
        Example:
            stats = service.get_statistics(location_id)
            print(f"Average rating: {stats['avg_rating']}")
        """
        try:
            location = self.get_by_id(location_id)
            if not location:
                return {}
            
            # Get review statistics
            reviews = self.db.query(Review).filter(
                Review.location_id == location_id
            ).all()
            
            rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for review in reviews:
                rating_distribution[review.rating] += 1
            
            return {
                'location_id': str(location_id),
                'name_vi': location.name_vi,
                'total_reviews': len(reviews),
                'average_rating': location.rating,
                'rating_distribution': rating_distribution,
                'categories': [cat.name_vi for cat in self.get_location_categories(location_id)]
            }
        except Exception as e:
            print(f"Error getting statistics: {e}")
            return {}
