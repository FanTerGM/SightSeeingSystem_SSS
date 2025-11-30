from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

from app.services.user_service import UserService
from app.services.location_service import LocationService
from app.services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/api/recommend", tags=["recommendation"])


@router.post("/")
def recommend(payload: dict, db=Depends(get_db)):

    user_id = payload.get("user_id")
    if not user_id:
        return {"error": "Missing user_id"}

    # Load user + history
    user = UserService(db).get_user_with_history(user_id)
    if not user:
        return {"error": "Invalid user_id"}

    # Load all locations
    locations = LocationService(db).get_all(limit=200)

    # Preferences
    prefs = payload.get("preferences", {}) or {}

    # Max stops (default = 3)
    max_stops = payload.get("max_stops", 3)

    # Generate recommendations
    try:
        result = generate_recommendations(
            user=user,
            locations=locations,
            payload=payload,
            user_prefs=prefs,
            max_stops=max_stops,
        )
    except Exception as e:
        return {"error": f"Recommendation failed: {e}"}

    return {
        "user_id": user_id,
        "start_point": payload.get("start_point"),
        "total_locations": len(locations),
        "recommendations": result,
    }
