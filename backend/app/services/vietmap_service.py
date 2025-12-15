import os
import httpx
from typing import Tuple, Optional

from dotenv import load_dotenv

load_dotenv()

VIETMAP_API_KEY = os.getenv("VIETMAP_API_KEY")
BASE_URL = os.getenv("VIETMAP_BASE_URL")


class VietMapService:
    """Wrapper for VietMap APIs using Async HTTPX."""

    @staticmethod
    async def _get(path: str, params: dict = None):
        if params is None:
            params = {}
        params["apikey"] = VIETMAP_API_KEY

        url = f"{BASE_URL.rstrip('/')}/{path.lstrip('/')}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                # Có thể log lỗi ở đây
                print(f"VietMap API Error: {e}")
                raise e

    @staticmethod
    async def autocomplete(q: str, limit: int = 5):
        return await VietMapService._get("autocomplete", {"text": q, "size": limit})

    @staticmethod
    async def geocode(address: str, limit: int = 5):
        return await VietMapService._get("search", {"text": address, "size": limit})

    @staticmethod
    async def reverse_geocode(lat: float, lng: float):
        return await VietMapService._get("reverse", {"point": f"{lat},{lng}"})

    @staticmethod
    async def nearby_search(
        lat: float,
        lng: float,
        radius: int = 500,
        category: Optional[str] = None,
        limit: int = 3,
    ):
        params = {
            "text": category if category else "",
            
            "focus.point.lat": lat,
            "focus.point.lon": lng,
            
            "size": limit
        }
        return await VietMapService._get("search", params)

    @staticmethod
    async def route(
        start: Tuple[float, float],
        end: Tuple[float, float],
        vehicle: str = "car",
        alternatives: bool = False,
    ):
        if not BASE_URL:
            raise RuntimeError("VIETMAP_BASE_URL is not configured")
        p1 = f"{start[0]},{start[1]}"  # lat,lng
        p2 = f"{end[0]},{end[1]}"  # lat,lng

        params = {
            "point": [p1, p2],
            "vehicle": vehicle,
            "alternatives": str(alternatives).lower(),
        }

        return await VietMapService._get("route", params)
