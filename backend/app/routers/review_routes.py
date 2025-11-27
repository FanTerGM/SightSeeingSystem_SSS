from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.review_service import ReviewService

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.post("/")
def create_review(data: dict, db: Session = Depends(get_db)):
    return ReviewService(db).create_review(data)


@router.get("/location/{location_id}")
def get_reviews(location_id: int, db: Session = Depends(get_db)):
    return ReviewService(db).get_reviews_for_location(location_id)
