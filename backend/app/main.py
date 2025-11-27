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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
