"""
SSS (Sight Seeing System) - FastAPI Backend
Main application file with API endpoints
"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import date, datetime
import uuid

from database import get_db, engine
import models

# Create tables (if not exists)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SSS API",
    description="SightSeeing System - Smart Tourism API for Ho Chi Minh City",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# PYDANTIC SCHEMAS
# ============================================

class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    name_vi: str
    icon: Optional[str]
    
    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    name: str
    name_vi: str
    description: Optional[str]
    address: str
    district: Optional[str]
    latitude: float
    longitude: float
    phone_number: Optional[str]
    website: Optional[str]
    price_level: Optional[str]
    average_visit_duration: Optional[int]

class LocationResponse(LocationBase):
    id: uuid.UUID
    rating: Optional[float]
    review_count: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str]

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone_number: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    location_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    comment: Optional[str]
    visit_date: Optional[date]

class ReviewResponse(BaseModel):
    id: uuid.UUID
    location_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    comment: Optional[str]
    visit_date: Optional[date]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ItineraryCreate(BaseModel):
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    start_point: dict
    end_point: Optional[dict]
    trip_date: Optional[date]

class ItineraryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    start_point: dict
    end_point: Optional[dict]
    total_distance: Optional[float]
    estimated_duration: Optional[int]
    trip_date: Optional[date]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🎯 SSS API - SightSeeing System for Ho Chi Minh City",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

# ============================================
# CATEGORIES ENDPOINTS
# ============================================

@app.get("/api/categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all categories"""
    categories = db.query(models.Category).all()
    return categories

@app.get("/api/categories/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a specific category"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

# ============================================
# LOCATIONS ENDPOINTS
# ============================================

@app.get("/api/locations", response_model=List[LocationResponse])
async def get_locations(
    skip: int = 0,
    limit: int = 100,
    district: Optional[str] = None,
    min_rating: Optional[float] = None,
    price_level: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get locations with optional filters
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **district**: Filter by district
    - **min_rating**: Minimum rating filter
    - **price_level**: Filter by price level (free, ₫, ₫₫, ₫₫₫)
    - **is_active**: Only show active locations
    """
    query = db.query(models.Location)
    
    if is_active:
        query = query.filter(models.Location.is_active == True)
    
    if district:
        query = query.filter(models.Location.district == district)
    
    if min_rating:
        query = query.filter(models.Location.rating >= min_rating)
    
    if price_level:
        query = query.filter(models.Location.price_level == price_level)
    
    locations = query.offset(skip).limit(limit).all()
    return locations

@app.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a specific location by ID"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@app.get("/api/locations/nearby")
async def get_nearby_locations(
    latitude: float = Query(..., description="Latitude of the point"),
    longitude: float = Query(..., description="Longitude of the point"),
    radius_km: float = Query(5.0, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """
    Get nearby locations using Haversine formula
    
    - **latitude**: Latitude of search point
    - **longitude**: Longitude of search point
    - **radius_km**: Search radius in kilometers (default 5km)
    - **limit**: Maximum results (default 10)
    """
    # Haversine formula in SQL
    query = f"""
        SELECT *,
        (
            6371 * acos(
                cos(radians({latitude})) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians({longitude})) +
                sin(radians({latitude})) *
                sin(radians(latitude))
            )
        ) AS distance
        FROM locations
        WHERE is_active = true
        HAVING distance < {radius_km}
        ORDER BY distance
        LIMIT {limit}
    """
    
    result = db.execute(query)
    locations = []
    for row in result:
        locations.append({
            "id": str(row.id),
            "name": row.name,
            "name_vi": row.name_vi,
            "address": row.address,
            "district": row.district,
            "latitude": float(row.latitude),
            "longitude": float(row.longitude),
            "rating": float(row.rating) if row.rating else None,
            "price_level": row.price_level,
            "distance_km": round(float(row.distance), 2)
        })
    
    return {"results": locations, "count": len(locations)}

# ============================================
# USERS ENDPOINTS
# ============================================

@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    # Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a specific user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============================================
# REVIEWS ENDPOINTS
# ============================================

@app.post("/api/reviews", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    """Create a new review"""
    # Verify location exists
    location = db.query(models.Location).filter(models.Location.id == review.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == review.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if review already exists
    existing_review = db.query(models.Review).filter(
        models.Review.location_id == review.location_id,
        models.Review.user_id == review.user_id
    ).first()
    if existing_review:
        raise HTTPException(status_code=400, detail="User has already reviewed this location")
    
    db_review = models.Review(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@app.get("/api/reviews/location/{location_id}", response_model=List[ReviewResponse])
async def get_location_reviews(location_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get all reviews for a specific location"""
    reviews = db.query(models.Review).filter(models.Review.location_id == location_id).all()
    return reviews

# ============================================
# ITINERARIES ENDPOINTS
# ============================================

@app.post("/api/itineraries", response_model=ItineraryResponse)
async def create_itinerary(itinerary: ItineraryCreate, db: Session = Depends(get_db)):
    """Create a new itinerary"""
    # Verify user exists
    user = db.query(models.User).filter(models.User.id == itinerary.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_itinerary = models.Itinerary(**itinerary.dict())
    db.add(db_itinerary)
    db.commit()
    db.refresh(db_itinerary)
    return db_itinerary

@app.get("/api/itineraries/user/{user_id}", response_model=List[ItineraryResponse])
async def get_user_itineraries(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get all itineraries for a specific user"""
    itineraries = db.query(models.Itinerary).filter(models.Itinerary.user_id == user_id).all()
    return itineraries

@app.get("/api/itineraries/{itinerary_id}", response_model=ItineraryResponse)
async def get_itinerary(itinerary_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a specific itinerary"""
    itinerary = db.query(models.Itinerary).filter(models.Itinerary.id == itinerary_id).first()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return itinerary

# ============================================
# STATISTICS ENDPOINTS
# ============================================

@app.get("/api/stats")
async def get_statistics(db: Session = Depends(get_db)):
    """Get general statistics"""
    total_locations = db.query(models.Location).filter(models.Location.is_active == True).count()
    total_reviews = db.query(models.Review).count()
    total_users = db.query(models.User).count()
    total_categories = db.query(models.Category).count()
    
    avg_rating = db.query(models.Location).filter(
        models.Location.is_active == True,
        models.Location.rating.isnot(None)
    ).with_entities(models.Location.rating).all()
    
    avg_rating_value = sum(r[0] for r in avg_rating if r[0]) / len(avg_rating) if avg_rating else 0
    
    return {
        "total_locations": total_locations,
        "total_reviews": total_reviews,
        "total_users": total_users,
        "total_categories": total_categories,
        "average_rating": round(avg_rating_value, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
