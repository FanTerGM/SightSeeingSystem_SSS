# app/routers/vietmap_routes.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from app.services.vietmap_service import VietMapService, VIETMAP_API_KEY

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
def autocomplete(q: str = Query(..., min_length=1), limit: int = 5):
    _ensure_key()
    try:
        return VietMapService.autocomplete(q, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap autocomplete error: {e}")


@router.get("/geocode")
def geocode(address: str = Query(..., min_length=1), limit: int = 5):
    _ensure_key()
    try:
        return VietMapService.geocode(address, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap geocode error: {e}")


@router.get("/reverse")
def reverse(lat: float, lng: float):
    _ensure_key()
    try:
        return VietMapService.reverse_geocode(lat, lng)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap reverse error: {e}")


@router.get("/nearby")
def nearby(
    lat: float,
    lng: float,
    radius: int = 500,
    category: Optional[str] = None,
    limit: int = 20,
):
    _ensure_key()
    try:
        return VietMapService.nearby_search(
            lat, lng, radius=radius, category=category, limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap nearby error: {e}")


@router.post("/route")
def route(body: RouteRequest):
    _ensure_key()
    try:
        res = VietMapService.route(
            start=(body.start_lat, body.start_lng),
            end=(body.end_lat, body.end_lng),
            vehicle=body.vehicle,
        )
        # Normalize a small common response structure so your recommendation logic can parse easily
        # Try to extract distance (m), duration (s), polyline if available
        # structure depends on VietMap response — adapt if needed
        normalized = {
            "raw": res,
            "distance_m": res.get("routes", [{}])[0].get("distance"),
            "duration_s": res.get("routes", [{}])[0].get("duration"),
            "polyline": res.get("routes", [{}])[0].get("geometry"),
        }
        return normalized
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap route error: {e}")


@router.post("/matrix")
def matrix(points: List[List[float]]):
    """
    Accepts JSON body: { "points": [[lat,lng],[lat,lng], ...] }
    """
    _ensure_key()
    try:
        pts = [(p[0], p[1]) for p in points]
        return VietMapService.matrix(pts)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"VietMap matrix error: {e}")
