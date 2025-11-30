import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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
