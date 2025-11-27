"""
Itinerary Service

Service class for managing travel itineraries.
"""

from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from datetime import date
import uuid

from models import Itinerary, ItineraryLocation, Location, User
from .base_service import BaseService


class ItineraryService(BaseService[Itinerary]):
    """
    Service class for Itinerary operations.
    
    Handles itinerary creation, location management, and route optimization.
    """
    
    def __init__(self, db: Session):
        """Initialize ItineraryService with database session."""
        super().__init__(Itinerary, db)
    
    def create_itinerary(
        self,
        user_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        start_point: Optional[Dict] = None,
        end_point: Optional[Dict] = None,
        trip_date: Optional[date] = None,
        status: str = 'draft'
    ) -> Optional[Itinerary]:
        """
        Create a new itinerary.
        
        Args:
            user_id: User UUID
            name: Itinerary name
            description: Optional description
            start_point: Starting location {lat, lng, name}
            end_point: Ending location {lat, lng, name}
            trip_date: Planned trip date
            status: 'draft', 'active', or 'completed'
            
        Returns:
            Created Itinerary instance or None if failed
            
        Example:
            itinerary = service.create_itinerary(
                user_id=user_id,
                name="Day Trip to District 1",
                start_point={"lat": 10.7720, "lng": 106.6981, "name": "Ben Thanh"},
                trip_date=date(2024, 12, 1)
            )
        """
        # Verify user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"User {user_id} not found")
            return None
        
        # Validate status
        if status not in ['draft', 'active', 'completed']:
            print("Status must be 'draft', 'active', or 'completed'")
            return None
        
        return self.create(
            user_id=user_id,
            name=name,
            description=description,
            start_point=start_point,
            end_point=end_point,
            trip_date=trip_date,
            status=status
        )
    
    def add_location_to_itinerary(
        self,
        itinerary_id: uuid.UUID,
        location_id: uuid.UUID,
        visit_order: int,
        distance_from_previous: Optional[float] = None,
        travel_time: Optional[int] = None,
        transport_mode: Optional[str] = 'car'
    ) -> bool:
        """
        Add a location to an itinerary.
        
        Args:
            itinerary_id: Itinerary UUID
            location_id: Location UUID
            visit_order: Order in the itinerary (1, 2, 3, ...)
            distance_from_previous: Distance in km from previous location
            travel_time: Travel time in minutes
            transport_mode: 'walk', 'car', 'bus', or 'grab'
            
        Returns:
            True if successful, False otherwise
            
        Example:
            success = service.add_location_to_itinerary(
                itinerary_id=itinerary_id,
                location_id=location_id,
                visit_order=1,
                distance_from_previous=2.5,
                travel_time=15,
                transport_mode='grab'
            )
        """
        try:
            # Verify itinerary exists
            itinerary = self.get_by_id(itinerary_id)
            if not itinerary:
                print(f"Itinerary {itinerary_id} not found")
                return False
            
            # Verify location exists
            location = self.db.query(Location).filter(
                Location.id == location_id
            ).first()
            if not location:
                print(f"Location {location_id} not found")
                return False
            
            # Check if location already in itinerary
            existing = self.db.query(ItineraryLocation).filter(
                ItineraryLocation.itinerary_id == itinerary_id,
                ItineraryLocation.location_id == location_id
            ).first()
            
            if existing:
                print("Location already in itinerary")
                return False
            
            # Validate transport mode
            valid_modes = ['walk', 'car', 'bus', 'grab']
            if transport_mode and transport_mode not in valid_modes:
                print(f"Transport mode must be one of: {valid_modes}")
                return False
            
            # Create itinerary location
            itin_loc = ItineraryLocation(
                itinerary_id=itinerary_id,
                location_id=location_id,
                visit_order=visit_order,
                distance_from_previous=distance_from_previous,
                travel_time=travel_time,
                transport_mode=transport_mode
            )
            
            self.db.add(itin_loc)
            self.db.commit()
            
            # Update itinerary totals
            self._update_itinerary_totals(itinerary_id)
            
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error adding location to itinerary: {e}")
            return False
    
    def remove_location_from_itinerary(
        self,
        itinerary_id: uuid.UUID,
        location_id: uuid.UUID
    ) -> bool:
        """
        Remove a location from an itinerary.
        
        Args:
            itinerary_id: Itinerary UUID
            location_id: Location UUID
            
        Returns:
            True if removed, False otherwise
        """
        try:
            itin_loc = self.db.query(ItineraryLocation).filter(
                ItineraryLocation.itinerary_id == itinerary_id,
                ItineraryLocation.location_id == location_id
            ).first()
            
            if not itin_loc:
                print("Location not in itinerary")
                return False
            
            self.db.delete(itin_loc)
            self.db.commit()
            
            # Update itinerary totals
            self._update_itinerary_totals(itinerary_id)
            
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error removing location: {e}")
            return False
    
    def get_itinerary_locations(
        self,
        itinerary_id: uuid.UUID
    ) -> List[Dict]:
        """
        Get all locations in an itinerary with details.
        
        Args:
            itinerary_id: Itinerary UUID
            
        Returns:
            List of dictionaries with location and itinerary details
            
        Example:
            locations = service.get_itinerary_locations(itinerary_id)
            for loc in locations:
                print(f"{loc['visit_order']}. {loc['location'].name_vi}")
        """
        try:
            itin_locs = self.db.query(ItineraryLocation).filter(
                ItineraryLocation.itinerary_id == itinerary_id
            ).order_by(ItineraryLocation.visit_order).all()
            
            result = []
            for itin_loc in itin_locs:
                location = self.db.query(Location).filter(
                    Location.id == itin_loc.location_id
                ).first()
                
                result.append({
                    'visit_order': itin_loc.visit_order,
                    'location': location,
                    'distance_from_previous': itin_loc.distance_from_previous,
                    'travel_time': itin_loc.travel_time,
                    'transport_mode': itin_loc.transport_mode
                })
            
            return result
        except Exception as e:
            print(f"Error getting itinerary locations: {e}")
            return []
    
    def _update_itinerary_totals(self, itinerary_id: uuid.UUID):
        """
        Update total distance and duration for an itinerary.
        
        Args:
            itinerary_id: Itinerary UUID
        """
        try:
            itin_locs = self.db.query(ItineraryLocation).filter(
                ItineraryLocation.itinerary_id == itinerary_id
            ).all()
            
            total_distance = sum(
                loc.distance_from_previous or 0 for loc in itin_locs
            )
            total_duration = sum(
                loc.travel_time or 0 for loc in itin_locs
            )
            
            # Add visit durations
            for itin_loc in itin_locs:
                location = self.db.query(Location).filter(
                    Location.id == itin_loc.location_id
                ).first()
                if location and location.average_visit_duration:
                    total_duration += location.average_visit_duration
            
            # Update itinerary
            self.update(
                itinerary_id,
                total_distance=total_distance,
                estimated_duration=total_duration
            )
        except Exception as e:
            print(f"Error updating itinerary totals: {e}")
    
    def get_user_itineraries(
        self,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Itinerary]:
        """
        Get all itineraries for a user.
        
        Args:
            user_id: User UUID
            status: Filter by status ('draft', 'active', 'completed')
            skip: Pagination skip
            limit: Pagination limit
            
        Returns:
            List of Itinerary instances
            
        Example:
            itineraries = service.get_user_itineraries(
                user_id=user_id,
                status='active'
            )
        """
        try:
            query = self.db.query(Itinerary).filter(
                Itinerary.user_id == user_id
            )
            
            if status:
                query = query.filter(Itinerary.status == status)
            
            return query.order_by(
                Itinerary.created_at.desc()
            ).offset(skip).limit(limit).all()
        except Exception as e:
            print(f"Error getting user itineraries: {e}")
            return []
    
    def update_itinerary_status(
        self,
        itinerary_id: uuid.UUID,
        status: str
    ) -> Optional[Itinerary]:
        """
        Update itinerary status.
        
        Args:
            itinerary_id: Itinerary UUID
            status: New status ('draft', 'active', 'completed')
            
        Returns:
            Updated Itinerary instance or None if failed
            
        Example:
            updated = service.update_itinerary_status(
                itinerary_id,
                'completed'
            )
        """
        if status not in ['draft', 'active', 'completed']:
            print("Status must be 'draft', 'active', or 'completed'")
            return None
        
        return self.update(itinerary_id, status=status)
    
    def get_itinerary_details(self, itinerary_id: uuid.UUID) -> Optional[Dict]:
        """
        Get complete itinerary details with all locations.
        
        Args:
            itinerary_id: Itinerary UUID
            
        Returns:
            Dictionary with itinerary and locations data
            
        Example:
            details = service.get_itinerary_details(itinerary_id)
            print(f"Itinerary: {details['itinerary'].name}")
            print(f"Total locations: {len(details['locations'])}")
            print(f"Total distance: {details['itinerary'].total_distance}km")
        """
        itinerary = self.get_by_id(itinerary_id)
        if not itinerary:
            return None
        
        locations = self.get_itinerary_locations(itinerary_id)
        
        return {
            'itinerary': itinerary,
            'locations': locations,
            'total_stops': len(locations)
        }
    
    def duplicate_itinerary(
        self,
        itinerary_id: uuid.UUID,
        new_name: Optional[str] = None
    ) -> Optional[Itinerary]:
        """
        Duplicate an existing itinerary.
        
        Args:
            itinerary_id: Itinerary UUID to duplicate
            new_name: Name for the new itinerary
            
        Returns:
            New Itinerary instance or None if failed
            
        Example:
            new_itin = service.duplicate_itinerary(
                itinerary_id,
                new_name="Copy of Day Trip"
            )
        """
        try:
            # Get original itinerary
            original = self.get_by_id(itinerary_id)
            if not original:
                return None
            
            # Create new itinerary
            new_itinerary = self.create_itinerary(
                user_id=original.user_id,
                name=new_name or f"{original.name} (Copy)",
                description=original.description,
                start_point=original.start_point,
                end_point=original.end_point,
                status='draft'
            )
            
            if not new_itinerary:
                return None
            
            # Copy locations
            locations = self.get_itinerary_locations(itinerary_id)
            for loc_data in locations:
                self.add_location_to_itinerary(
                    itinerary_id=new_itinerary.id,
                    location_id=loc_data['location'].id,
                    visit_order=loc_data['visit_order'],
                    distance_from_previous=loc_data['distance_from_previous'],
                    travel_time=loc_data['travel_time'],
                    transport_mode=loc_data['transport_mode']
                )
            
            return new_itinerary
        except Exception as e:
            print(f"Error duplicating itinerary: {e}")
            return None
