from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.location_service import LocationService

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/")
def get_all(db: Session = Depends(get_db)):
    return LocationService(db).get_all_locations()


@router.get("/{location_id}")
def get_by_id(location_id: int, db: Session = Depends(get_db)):
    return LocationService(db).get_location_by_id(location_id)


@router.get("/search/")
def search(query: str, db: Session = Depends(get_db)):
    return LocationService(db).search_locations(query)


@router.get("/nearby/")
def nearby(lat: float, lon: float, radius: float = 1000, db: Session = Depends(get_db)):
    return LocationService(db).get_locations_nearby(lat, lon, radius)
