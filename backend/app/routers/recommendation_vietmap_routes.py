from fastapi import APIRouter, Depends
from app.database import get_db
from sqlalchemy.orm import Session
from app.services.location_service import LocationService
from app.services.user_service import UserService
from app.services.recommend_vietmap import generate_recommendations_vietmap

router = APIRouter(prefix="/api/recommend", tags=["Recommendation"])


@router.post("/route-aware")
def recommend_route_aware(data: dict, db: Session = Depends(get_db)):

    user = UserService(db).get_user_with_history(data["user_id"])
    locations = LocationService(db).get_all()
    prefs = data.get("preferences", {})
    max_stops = data.get("max_stops", 3)

    rec = generate_recommendations_vietmap(
        user, locations, data, prefs, max_stops=max_stops
    )

    return {"count": len(rec), "recommendations": rec}
