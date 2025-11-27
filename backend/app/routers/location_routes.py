from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.location_service import LocationService
from app.schemas.location_schema import LocationResponse

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/", response_model=list[LocationResponse])
def get_all(db: Session = Depends(get_db)):
    return LocationService(db).get_all()


@router.get("/{location_id}", response_model=LocationResponse)
def get_by_id(location_id: int, db: Session = Depends(get_db)):
    return LocationService(db).get_by_id(location_id)


@router.get("/search/", response_model=list[LocationResponse])
def search(query: str, db: Session = Depends(get_db)):
    return LocationService(db).search_locations(query)


@router.get("/nearby/", response_model=list[LocationResponse])
def nearby(lat: float, lon: float, radius: float = 1000, db: Session = Depends(get_db)):
    return LocationService(db).find_nearby(lat, lon, radius)
