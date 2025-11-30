import uuid
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


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
