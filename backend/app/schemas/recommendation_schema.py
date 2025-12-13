import uuid
from pydantic import BaseModel
from typing import Optional, Dict, List, Any


class RecommendationRequest(BaseModel):
    user_id: uuid.UUID
    start_point: Dict[str, float]  # e.g., {"lat": 10.77, "lng": 106.69}
    preferences: Optional[Dict[str, Any]] = {}
    max_stops: Optional[int] = 3
