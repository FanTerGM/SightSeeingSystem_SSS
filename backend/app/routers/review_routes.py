from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.review_service import ReviewService
from app.schemas.review_schema import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.post("/", response_model=ReviewResponse)
def create_review(data: ReviewCreate, db: Session = Depends(get_db)):
    return ReviewService(db).create_review(**data.model_dump())


@router.get("/location/{location_id}", response_model=list[ReviewResponse])
def get_reviews(location_id: int, db: Session = Depends(get_db)):
    return ReviewService(db).get_location_reviews(location_id)
