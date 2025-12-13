import math
from math import log
from app.services.vietmap_service import VietMapService


def normalize_point(p):
    return {"lat": p["lat"], "lng": p["lng"]}


async def get_route_distance_km(start, end):
    """Use VietMap Route API for real-world travel distance."""
    try:
        res = await VietMapService.route(
            start=(start["lat"], start["lng"]),
            end=(end["lat"], end["lng"]),
            vehicle="car",
        )
        dist = res.get("distance_m")

        if "paths" in res and len(res["paths"]) > 0:
            dist = res["paths"][0]["distance"]

        if dist:
            return dist / 1000.0
    except:
        pass
    return None


def haversine(a, b):
    R = 6371
    from math import sin, cos, atan2, radians, sqrt

    dlat = radians(b["lat"] - a["lat"])
    dlon = radians(b["lng"] - a["lng"])
    la1, la2 = radians(a["lat"]), radians(b["lat"])
    h = sin(dlat / 2) ** 2 + cos(la1) * cos(la2) * sin(dlon / 2) ** 2
    return 2 * R * atan2(sqrt(h), sqrt(1 - h))


def calculate_weighted_score(location, dst_km, preferences, user_history):
    distance_score = max(0, 1 - dst_km / 10)

    rating_score = (location.rating or 0) / 5
    pop = location.review_count or 0
    popularity_score = min(1, log(1 + pop) / log(1000))

    pref_cat = preferences.get("preferred_categories", [])
    loc_cat = [str(c.category_id) for c in location.categories]

    if pref_cat:
        match = len([x for x in loc_cat if x in pref_cat])
        category_score = match / len(pref_cat)
    else:
        category_score = 0.5

    history_score = 0.7 if any(h["rating"] >= 4 for h in user_history) else 0.5

    final = (
        distance_score * 0.35
        + rating_score * 0.25
        + category_score * 0.20
        + popularity_score * 0.10
        + history_score * 0.10
    )

    return {
        "total": final,
        "details": {
            "distance": distance_score,
            "rating": rating_score,
            "category": category_score,
            "popularity": popularity_score,
            "history": history_score,
        },
    }


async def generate_recommendations_vietmap(user, locations, payload, user_prefs, max_stops=1):

    start_point = normalize_point(payload["start_point"])
    user_history = user.get("history", [])

    recs = []

    for loc in locations:
        dst_km = await get_route_distance_km(
            start_point, {"lat": loc.latitude, "lng": loc.longitude}
        )

        if not dst_km:
            dst_km = haversine(
                start_point, {"lat": loc.latitude, "lng": loc.longitude}
        )

        score = calculate_weighted_score(
            location=loc,
            dst_km=dst_km,
            preferences=user_prefs,
            user_history=user_history,
        )

        recs.append(
            {
                "location_id": str(loc.id),
                "name_vi": loc.name_vi,
                "district": loc.district,
                "distance_km": dst_km,
                "coordinates": {"lat": loc.latitude, "lng": loc.longitude},
                "categories": (
                    [c.category.name for c in loc.categories] if loc.categories else []
                ),
                "score": score["total"],
            }
        )

    recs.sort(key=lambda x: x["score"], reverse=True)
    return recs[:max_stops]
