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
        return await VietMapService._get("reverse", {"point": f"{lng},{lat}"})

    @staticmethod
    async def nearby_search(
        lat: float,
        lng: float,
        radius: int = 500,
        category: Optional[str] = None,
        limit: int = 20,
    ):
        params = {"point": f"{lng},{lat}", "radius": radius, "size": limit}
        if category:
            params["category"] = category
        return await VietMapService._get("nearby", params)

    @staticmethod
    async def route(
        start: Tuple[float, float],
        end: Tuple[float, float],
        vehicle: str = "car",
        alternatives: bool = False,
    ):
        point_param = f"{start[1]},{start[0]}|{end[1]},{end[0]}"
        params = {"point": point_param, "vehicle": vehicle}
        if alternatives:
            params["alternatives"] = "true"
        return await VietMapService._get("route", params)
