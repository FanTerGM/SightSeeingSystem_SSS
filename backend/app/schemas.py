from pydantic import BaseModel
from typing import Optional, List


# -----------------------------------
# BASIC SHARED SCHEMAS
# -----------------------------------


class Coordinate(BaseModel):
    latitude: float
    longitude: float


# -----------------------------------
# USER SCHEMAS
# -----------------------------------


class UserCreate(BaseModel):
    name: str
    email: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        orm_mode = True


# -----------------------------------
# CATEGORY SCHEMAS
# -----------------------------------


class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


# -----------------------------------
# LOCATION SCHEMAS
# (For returning location info to client)
# -----------------------------------


class LocationOut(BaseModel):
    id: int
    name: str
    category: str
    rating: Optional[float]
    budget: Optional[int]
    popularity: Optional[int]
    latitude: float
    longitude: float

    class Config:
        orm_mode = True


# -----------------------------------
# REVIEW SCHEMAS
# -----------------------------------


class ReviewCreate(BaseModel):
    user_id: int
    location_id: int
    rating: float
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: float
    comment: Optional[str]

    class Config:
        orm_mode = True


# -----------------------------------
# ITINERARY SCHEMAS
# -----------------------------------


class ItineraryCreate(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = None
    start_point: Coordinate
    end_point: Optional[Coordinate] = None


class ItineraryOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    user_id: int

    class Config:
        orm_mode = True


# -----------------------------------
# RECOMMENDATION SCHEMAS
# (For your weighted scoring function)
# -----------------------------------


class Preferences(BaseModel):
    budget_level: Optional[int] = None
    preferred_categories: List[str] = []
    travel_pace: Optional[str] = None
    available_time: Optional[int] = None


class Constraints(BaseModel):
    max_stops: int = 3
    max_total_distance: Optional[float] = None
    trip_date: Optional[str] = None


class RecommendationRequest(BaseModel):
    userId: int
    startPoint: Coordinate
    endPoint: Optional[Coordinate] = None
    preferences: Preferences
    constraints: Constraints


class RecommendationLocation(BaseModel):
    id: int
    name: str
    category: str
    rating: Optional[float]
    budget: Optional[int]
    popularity: Optional[int]

    class Config:
        orm_mode = True


class RecommendationResult(BaseModel):
    location: RecommendationLocation
    score: float
    breakdown: dict
