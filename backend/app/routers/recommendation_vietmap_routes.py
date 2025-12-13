from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.user_service import UserService
from app.services.location_service import LocationService
from app.services.recommend_vietmap import generate_recommendations_vietmap

from app.schemas.recommendation_schema import RecommendationRequest

router = APIRouter(prefix="/api/recommend", tags=["Recommendation"])


@router.post("/route-aware")
async def recommend_route_aware(req: RecommendationRequest, db: Session = Depends(get_db)):
    user = UserService(db).get_user_with_history(str(req.user_id))
    locations = LocationService(db).get_all()

    payload_dict = {"start_point": req.start_point}

    rec = await generate_recommendations_vietmap(
        user=user,
        locations=locations,
        payload=payload_dict,
        user_prefs=req.preferences,
        max_stops=req.max_stops,
    )

    return {"count": len(rec), "recommendations": rec}
