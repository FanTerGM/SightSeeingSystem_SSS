import math

# ============================================================
# MAIN ENTRY FUNCTION
# ============================================================


def generate_recommendations(user, locations, payload, user_prefs, max_stops=3):

    start_point = normalize_point(payload.get("start_point"))
    user_history = user.get("history", [])

    results = []

    for loc in locations:
        score = calculate_weighted_score(
            location=loc,
            start_point=start_point,
            preferences=user_prefs,
            user_history=user_history,
        )

        # Convert categories -> names
        category_names = [c.category.name for c in loc.categories]
        category_names_vi = [c.category.name_vi for c in loc.categories]

        results.append(
            {
                "location_id": str(loc.id),
                "name": loc.name,
                "name_vi": loc.name_vi,
                "address": loc.address,
                "district": loc.district,
                "rating": loc.rating,
                "review_count": loc.review_count,
                "coordinates": {"lat": loc.latitude, "lng": loc.longitude},
                "categories": category_names,
                "categories_vi": category_names_vi,
                "score": score["total"],
                "breakdown": score["details"],
            }
        )

    # Sort descending
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:max_stops]


# ============================================================
# SCORE ENGINE (simple & SAFE)
# ============================================================


def calculate_weighted_score(location, start_point, preferences, user_history):
    # Extract coordinates
    loc_point = {"latitude": location.latitude, "longitude": location.longitude}

    # 1) Distance score (0–1)
    distance = haversine_distance(start_point, loc_point)
    distance_score = max(0, 1 - (distance / 10.0))

    # 2) Rating score (0–1)
    rating = location.rating or 0
    rating_score = min(1.0, rating / 5.0)

    # 3) Popularity score (0–1, log scale)
    pop = location.review_count or 0
    popularity_score = min(1.0, math.log(1 + pop) / math.log(1000))

    # 4) Category match (0–1)
    pref_categories = preferences.get("preferred_categories", []) or []
    loc_categories = [str(c.category_id) for c in location.categories]

    if pref_categories:
        matches = sum(1 for c in loc_categories if c in pref_categories)
        category_score = matches / len(pref_categories)
    else:
        category_score = 0.5  # neutral if user has no preference

    # 5) History score (0–1)
    history_score = 0.5
    if user_history:
        liked = [h for h in user_history if h.get("rating", 0) >= 4]
        if liked:
            history_score = 0.7

    # Weight combination
    final_score = (
        distance_score * 0.35
        + rating_score * 0.25
        + category_score * 0.20
        + popularity_score * 0.10
        + history_score * 0.10
    )

    return {
        "total": final_score,
        "details": {
            "distance": distance_score,
            "rating": rating_score,
            "category": category_score,
            "popularity": popularity_score,
            "history": history_score,
        },
    }


# ============================================================
# HELPER — Haversine formula
# ============================================================

# Calculate distance between two lat/lng points in kilometers
def haversine_distance(p1, p2):
    R = 6371

    lat1 = math.radians(p1["latitude"])
    lat2 = math.radians(p2["latitude"])
    dlat = lat2 - lat1
    dlon = math.radians(p2["longitude"] - p1["longitude"])

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def normalize_point(p):
    """
    Convert any coordinate format into a standard format:
    { latitude: float, longitude: float }
    Accepts {lat, lng} or {latitude, longitude}
    """
    if "lat" in p and "lng" in p:
        return {"latitude": p["lat"], "longitude": p["lng"]}
    return {"latitude": p.get("latitude"), "longitude": p.get("longitude")}
