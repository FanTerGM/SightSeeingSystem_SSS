from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.itinerary_service import ItineraryService
from app.schemas.itinerary_schema import ItineraryCreate, ItineraryResponse

router = APIRouter(prefix="/api/itineraries", tags=["Itineraries"])


@router.post("/", response_model=ItineraryResponse)
def create_itinerary(data: ItineraryCreate, db: Session = Depends(get_db)):
    return ItineraryService(db).create_itinerary(data.dict())


@router.get("/{itinerary_id}", response_model=ItineraryResponse)
def get_details(itinerary_id: str, db: Session = Depends(get_db)):
    return ItineraryService(db).get_itinerary_details(itinerary_id)


@router.get("/user/{user_id}", response_model=list[ItineraryResponse])
def get_by_user(user_id: str, db: Session = Depends(get_db)):
    return ItineraryService(db).get_itineraries_for_user(user_id)
