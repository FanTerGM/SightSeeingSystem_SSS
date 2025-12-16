# app/routers/vietmap_routes.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from app.services.vietmap_service import VietMapService, VIETMAP_API_KEY
import logging
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/vietmap", tags=["VietMap"])


def _ensure_key():
    if not VIETMAP_API_KEY:
        raise HTTPException(status_code=500, detail="VietMap API key not configured")


class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    vehicle: Optional[str] = "car"


@router.get("/autocomplete")
async def autocomplete(text: str = Query(..., min_length=1), limit: int = 5):
    _ensure_key()
    try:
        return await VietMapService.autocomplete(text, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap autocomplete error: {e}")

@router.post("/route")
async def route(request: RouteRequest):
    _ensure_key()
    try:
        return await VietMapService.route(
            (request.start_lat, request.start_lng),
            (request.end_lat, request.end_lng),
            vehicle=request.vehicle,
        )
    except Exception as e:
        logger.exception("Error in VietMap route")
        raise HTTPException(status_code=502, detail=f"VietMap route error: {e}")

@router.get("/geocode")
async def geocode(address: str = Query(..., min_length=1), limit: int = 5):
    _ensure_key()
    try:
        return await VietMapService.geocode(address, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap geocode error: {e}")
    
@router.get("/reverse_geocode")
async def reverse_geocode(lat: float, lng: float):
    _ensure_key()
    try:
        return await VietMapService.reverse_geocode(lat, lng)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap reverse geocode error: {e}")
    
@router.get("/nearby_search")
async def nearby_search(
    lat: float,
    lng: float,
    radius: int = 500,
    category: Optional[str] = None,
    limit: int = 20,
):
    _ensure_key()
    try:
        return await VietMapService.nearby_search(
            lat, lng, radius=radius, category=category, limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap nearby search error: {e}")
    