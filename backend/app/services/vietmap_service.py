import os
import time
import requests
from typing import Tuple, List, Optional

from dotenv import load_dotenv

load_dotenv()  # ensure .env loaded if running script directly

VIETMAP_API_KEY = os.getenv("VIETMAP_API_KEY", "")
BASE_URL = os.getenv("VIETMAP_BASE_URL", "https://maps.vietmap.vn/api")

if not VIETMAP_API_KEY:
    # not fatal here; endpoints will raise HTTPException later if used
    pass


# Simple in-memory TTL cache (process-level)
_cache = {}
_DEFAULT_TTL = 60  # seconds


def _cache_get(key):
    rec = _cache.get(key)
    if not rec:
        return None
    value, expiry = rec
    if time.time() > expiry:
        del _cache[key]
        return None
    return value


def _cache_set(key, value, ttl=_DEFAULT_TTL):
    _cache[key] = (value, time.time() + ttl)


class VietMapService:
    """Thin wrapper for VietMap APIs used by this project."""

    @staticmethod
    def _get(path: str, params: dict = None, ttl: Optional[int] = None):
        if params is None:
            params = {}
        params["apikey"] = VIETMAP_API_KEY
        url = f"{BASE_URL.rstrip('/')}/{path.lstrip('/')}"
        # build cache key (url + sorted params)
        key = url + "?" + "&".join(f"{k}={params[k]}" for k in sorted(params))
        if ttl:
            hit = _cache_get(key)
            if hit is not None:
                return hit

        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if ttl:
            _cache_set(key, data, ttl)
        return data

    # --- Autocomplete / search
    @staticmethod
    def autocomplete(q: str, limit: int = 5):
        """Return autocomplete suggestions."""
        return VietMapService._get("autocomplete", {"text": q, "size": limit}, ttl=30)

    @staticmethod
    def geocode(address: str, limit: int = 5):
        """Name/address -> candidates with lat/lng."""
        return VietMapService._get("search", {"text": address, "size": limit}, ttl=60)

    @staticmethod
    def reverse_geocode(lat: float, lng: float):
        """Lat/lng -> nearest address."""
        # VietMap expects point=lng,lat
        return VietMapService._get("reverse", {"point": f"{lng},{lat}"}, ttl=60)

    # --- Place detail (if VietMap exposes)
    @staticmethod
    def place_detail(place_id: str):
        """Place details by id (if supported)."""
        return VietMapService._get(f"place/{place_id}", ttl=60)

    # --- Nearby search (POI around lat/lng)
    @staticmethod
    def nearby_search(
        lat: float,
        lng: float,
        radius: int = 500,
        category: Optional[str] = None,
        limit: int = 20,
    ):
        params = {"point": f"{lng},{lat}", "radius": radius, "size": limit}
        if category:
            params["category"] = category
        return VietMapService._get("nearby", params, ttl=30)

    # --- Route
    @staticmethod
    def route(
        start: Tuple[float, float],
        end: Tuple[float, float],
        vehicle: str = "car",
        alternatives: bool = False,
    ):
        """
        start/end: (lat, lng)
        returns routing JSON including distance (m), duration (s), polyline etc.
        """
        # VietMap route typically gets points as lng,lat|lng,lat
        point_param = f"{start[1]},{start[0]}|{end[1]},{end[0]}"
        params = {"point": point_param, "vehicle": vehicle}
        if alternatives:
            params["alternatives"] = "true"
        return VietMapService._get("route", params, ttl=5)

    # --- Optional: matrix (distance/time between multiple points)
    @staticmethod
    def matrix(points: List[Tuple[float, float]], vehicle: str = "car"):
        """
        points: list of (lat, lng)
        Returns matrix response if VietMap supports /matrix endpoint
        """
        # build points as lng,lat; pipe-separated
        pts = "|".join(f"{lng},{lat}" for lat, lng in points)
        return VietMapService._get(
            "matrix", {"points": pts, "vehicle": vehicle}, ttl=60
        )
