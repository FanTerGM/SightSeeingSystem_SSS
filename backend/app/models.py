"""
SQLAlchemy ORM Models
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    itineraries = relationship("Itinerary", back_populates="user")
    reviews = relationship("Review", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    name_vi = Column(String(100), nullable=False)
    icon = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    locations = relationship("LocationCategory", back_populates="category")

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    name_vi = Column(String(255), nullable=False)
    description = Column(Text)
    address = Column(Text, nullable=False)
    district = Column(String(100))
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    phone_number = Column(String(20))
    website = Column(Text)
    price_level = Column(String(10))
    average_visit_duration = Column(Integer)
    
    rating = Column(Float)
    review_count = Column(Integer, default=0)
    
    opening_hours = Column(JSONB)
    closing_hours = Column(JSONB)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("price_level IN ('free', '₫', '₫₫', '₫₫₫')", name='check_price_level'),
        CheckConstraint("rating >= 0 AND rating <= 5", name='check_rating'),
    )
    
    # Relationships
    categories = relationship("LocationCategory", back_populates="location")
    reviews = relationship("Review", back_populates="location")
    itinerary_locations = relationship("ItineraryLocation", back_populates="location")

class LocationCategory(Base):
    __tablename__ = "location_categories"
    
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id', ondelete='CASCADE'), primary_key=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    location = relationship("Location", back_populates="categories")
    category = relationship("Category", back_populates="locations")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id', ondelete='CASCADE'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    visit_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name='check_review_rating'),
    )
    
    # Relationships
    location = relationship("Location", back_populates="reviews")
    user = relationship("User", back_populates="reviews")

class Itinerary(Base):
    __tablename__ = "itineraries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    start_point = Column(JSONB)
    end_point = Column(JSONB)
    total_distance = Column(Float)
    estimated_duration = Column(Integer)
    
    trip_date = Column(Date)
    status = Column(String(20), default='draft')
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'completed')", name='check_status'),
    )
    
    # Relationships
    user = relationship("User", back_populates="itineraries")
    locations = relationship("ItineraryLocation", back_populates="itinerary")

class ItineraryLocation(Base):
    __tablename__ = "itinerary_locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    itinerary_id = Column(UUID(as_uuid=True), ForeignKey('itineraries.id', ondelete='CASCADE'))
    location_id = Column(UUID(as_uuid=True), ForeignKey('locations.id', ondelete='CASCADE'))
    visit_order = Column(Integer, nullable=False)
    distance_from_previous = Column(Float)
    travel_time = Column(Integer)
    transport_mode = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("transport_mode IN ('walk', 'car', 'bus', 'grab')", name='check_transport_mode'),
    )
    
    # Relationships
    itinerary = relationship("Itinerary", back_populates="locations")
    location = relationship("Location", back_populates="itinerary_locations")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    budget_level = Column(String(20))
    preferred_categories = Column(ARRAY(UUID(as_uuid=True)))
    travel_pace = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("budget_level IN ('low', 'medium', 'high')", name='check_budget_level'),
        CheckConstraint("travel_pace IN ('slow', 'moderate', 'fast')", name='check_travel_pace'),
    )
    
    # Relationships
    user = relationship("User", back_populates="preferences")
