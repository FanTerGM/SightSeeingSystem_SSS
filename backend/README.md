# 📘 API Documentation for Smart Tourism Backend

This document explains how to use the available backend APIs, including **User**, **Category**, **Location**, **Review**, **Itinerary**, **Recommendation**, and **VietMap integration**.

---

# 🔧 Base URL

```
http://localhost:8000/api
```

---

# 🧩 1. User APIs

## ➤ Create User

**POST** `/users`

### Input

```json
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "0123456789"
}
```

### Output

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone_number": "0123456789",
  "created_at": "timestamp"
}
```

---

# 🏷️ 2. Category APIs

## ➤ Get All Categories

**GET** `/categories`

### Output

```json
[
  {
    "id": "uuid",
    "name": "Historical",
    "name_vi": "Lịch sử",
    "icon": "museum"
  }
]
```

---

# 📍 3. Location APIs

## ➤ Get All Locations

**GET** `/locations`

### Output

```json
[
  {
    "id": "uuid",
    "name": "Notre Dame Cathedral",
    "name_vi": "Nhà thờ Đức Bà",
    "district": "District 1",
    "rating": 4.7,
    "review_count": 1200
  }
]
```

---

## ➤ Get One Location

**GET** `/locations/{location_id}`

---

# ⭐ 4. Review APIs

## ➤ Create Review

**POST** `/reviews`

```json
{
  "location_id": "uuid",
  "user_id": "uuid",
  "rating": 5,
  "comment": "Amazing!"
}
```

---

# 🗺️ 5. Itinerary APIs

## ➤ Create Itinerary

**POST** `/itineraries`

```json
{
  "user_id": "uuid",
  "name": "Trip Day 1",
  "start_point": {"lat": 10.77, "lng": 106.69}
}
```

---

# 🤖 6. Recommendation API

## Endpoint

**POST** `/recommend`

### Input

```json
{
  "user_id": "uuid",
  "start_point": {"lat": 10.77, "lng": 106.69},
  "preferences": {
    "budget_level": "medium",
    "travel_pace": "moderate",
    "preferred_categories": []
  },
  "max_stops": 3
}
```

### Output

```json
{
  "user_id": "uuid",
  "start_point": {"lat": 10.77, "lng": 106.69},
  "total_locations": 10,
  "recommendations": [
    {
      "location": {
        "id": "uuid",
        "name": "War Remnants Museum",
        "district": "District 3"
      },
      "score": 0.81,
      "breakdown": {
        "distance": 0.89,
        "rating": 0.94,
        "category": 0.5,
        "popularity": 1.0,
        "history": 0.7
      }
    }
  ]
}
```

---

# 🧭 7. Additional VietMap APIs (Full List)

Below are all **recommended VietMap APIs** you should use for a complete smart‑tourism system.

## ✔ 7.1 Search API (Place Suggestion)

**GET** `/vietmap/search?query=`

### Example

```
/vietmap/search?query=landmark 81
```

### Output

```json
[
  {
    "name": "Landmark 81",
    "address": "Binh Thanh District",
    "lat": 10.794,
    "lng": 106.722
  }
]
```

---

## ✔ 7.2 Autocomplete API

Suggests places as user types.

**GET** `/vietmap/autocomplete?text=`

### Output

```json
[
  { "label": "Ben Thanh Market", "lat": 10.77, "lng": 106.69 }
]
```

---

## ✔ 7.3 Distance Matrix API

Used to calculate travel time & distance between multiple locations — useful for route optimization.

**POST** `/vietmap/distance-matrix`

### Request

```json
{
  "origins": [ { "lat": 10.77, "lng": 106.69 } ],
  "destinations": [
    { "lat": 10.78, "lng": 106.70 },
    { "lat": 10.79, "lng": 106.72 }
  ]
}
```

### Response

```json
[
  { "distance": 1200, "duration": 260 },
  { "distance": 2400, "duration": 520 }
]
```

---

# ⚛️ 8. How Frontend Calls the API

## ✅ 1) Create file api.js

ALL-IN-ONE json file to hold all APIs

📌 api.js
```json
const API_BASE = "http://localhost:8000/api";

/* Helper GET */
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    return await res.json();
}

/* Helper POST */
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return await res.json();
}

/* ---------------- USERS ---------------- */
export function createUser(data) {
    return apiPost("/users", data);
}

export function getUser(id) {
    return apiGet(`/users/${id}`);
}

/* ---------------- LOCATIONS ---------------- */
export function getLocations() {
    return apiGet("/locations");
}

/* ---------------- CATEGORIES ---------------- */
export function getCategories() {
    return apiGet("/categories");
}

/* ---------------- REVIEWS ---------------- */
export function createReview(data) {
    return apiPost("/reviews", data);
}

/* ---------------- RECOMMENDATIONS ---------------- */
export function getRecommendations(payload) {
    return apiPost("/recommend", payload);
}

/* ---------------- VIETMAP ---------------- */
export function vietmapAutocomplete(q) {
    return apiGet(`/vietmap/autocomplete?q=${encodeURIComponent(q)}`);
}

export function vietmapRoute(start, end) {
    return apiPost("/vietmap/route", {
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        vehicle: "car"
    });
}
```


## 2) Example:
📌 main.js or map.js
```json
import { getRecommendations } from "./api.js";

async function loadRecommendations() {
    const payload = {
        user_id: "2bc36657-d8b8-4aa2-9818-cd833bde9a09",
        start_point: { lat: 10.77, lng: 106.69 },
        end_point: { lat: 10.78, lng: 106.70 },
        preferences: {
            budget_level: "medium",
            travel_pace: "moderate",
            preferred_categories: []
        },
        constraints: { max_stops: 3 }
    };

    const result = await getRecommendations(payload);
    console.log("RECOMMEND:", result);
}
```

---

# ✅ Summary

This backend supports:

* CRUD for users, categories, locations, reviews
* Saving itineraries
* AI-like recommendations
* VietMap map/geocode/route integration
