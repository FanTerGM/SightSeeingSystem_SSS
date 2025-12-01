import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


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
