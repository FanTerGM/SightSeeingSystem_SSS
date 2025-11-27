from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.itinerary_service import ItineraryService

router = APIRouter(prefix="/api/itineraries", tags=["Itineraries"])


@router.post("/")
def create_itinerary(data: dict, db: Session = Depends(get_db)):
    return ItineraryService(db).create_itinerary(data)


@router.get("/{itinerary_id}")
def get_details(itinerary_id: str, db: Session = Depends(get_db)):
    return ItineraryService(db).get_itinerary_details(itinerary_id)


@router.get("/user/{user_id}")
def get_by_user(user_id: str, db: Session = Depends(get_db)):
    return ItineraryService(db).get_itineraries_for_user(user_id)
