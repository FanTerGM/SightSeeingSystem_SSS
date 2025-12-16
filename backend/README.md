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

**POST** `/recommend/route-aware`

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
    "count": 3,
    "recommendations": [
        {
            "location_id": "bb763eb0-010a-4e3c-ba32-c3503a42c973",
            "name_vi": "Bảo tàng Chứng tích chiến tranh",
            "district": "District 3",
            "distance_km": 1.0318093813743718,
            "coordinates": {
                "lat": 10.779,
                "lng": 106.6923
            },
            "categories": [
                "Historical",
                "Entertainment"
            ],
            "score": 0.8188866716518969
        },
        ...
```

---

# 🧭 7. Additional VietMap APIs (Full List)

Below are all **recommended VietMap APIs** you should use for a complete smart‑tourism system.

## ✔ 7.1 Search API (Geocoding)

**GET** `/vietmap/geocode`

### Example

```
/vietmap/geocode?address=197 Trần Phú, Phường 4, Quận 5, TP. Hồ Chí Minh
```

### Output

```json
{
    "code": "OK",
    "message": null,
    "data": {
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        106.67590269100003,
                        10.759222947000069
                    ]
                },
                "properties": {
                    "layer": "",
                    "name": "197 Trần Phú",
                    "housenumber": "",
                    "street": "",
                    "distance": -1,
                    "accuracy": "point",
                    ...
```

---

## ✔ 7.2 Autocomplete API

Suggests places as user types.

**GET** `/vietmap/autocomplete?text=`

### Example

```
/vietmap/autocomplete?text=y
```

### Output

```json
{
    "code": "OK",
    "message": null,
    "data": {
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        105.77496038800007,
                        10.033616540000025
                    ]
                },
                "properties": {
                    "layer": "address",
                    "name": "135h-y Đường Trần Hưng Đạo",
                    "housenumber": "",
                    "street": "",
                    "distance": -1,
                    "accuracy": "point",
                    ...
```

---

## ✔ 7.3 Routing API

Used to instruct the system to plan a travel path.
FE can use this API to display the route of a trip.

**POST** `/vietmap/route`

### Request

```json
{
  "start_lat": 10.77,
  "start_lng": 106.69,
  "end_lat": 10.79,
  "end_lng": 106.72,
  "vehicle": "car"
}
```

### Response

```json
{
    "license": "vietmap",
    "code": "OK",
    "messages": null,
    "paths": [
        {
            "distance": 4920.9,
            "weight": 556.1,
            "time": 556100,
            "transfers": 0,
            "points_encoded": true,
            "bbox": [
                106.69004,
                10.76939,
                106.71999,
                10.79002
            ],
            "points": "uov`Aw{djSx@m@dAs@}@uAe@u@S[m@_Am@aA_A}AkAgBU_@DG@MAKEGKEM?KDiCwEg@{@[g@_AwAcAeBc@q@o@cAU]MSm@kAg@y@y@kAmAgAgEoDkB_BmAgAmFcF_GaFgDuCgAgAyGcGoAmAuBqBlBgBVUfAmAn@o@bBqBs@e@{@bA}CfDoJmHg@_@o@g@k@a@i@YmAc@e@Mo@S_FwAqDcAqAa@[OYOWQ][_@e@QSc@w@Us@K{@Ce@?o@DiAFu@PqAVyCPmATaBLIR[Bq@BaACe@KoASw@G[[[FM?OCKEIIGICO?i@sACI?SKe@OUa@e@p@_@d@Up@YhAi@u@qAy@sAy@iAy@oA",
            "instructions": [
                {
                  ...
```

---
# 🤖 8. New AI APIs
## Chatbot reccomendation (Smart Chat)
AI automatically understands user location (via text) and suggests places.

**POST** `/ai/recommend-chat`

### Input

```json
{
  "user_id": "user-uuid",
  "message": "Tôi đang ở Chợ Bến Thành, tìm quán ăn ngon bổ rẻ quanh đây"
}
```
Logic Flow

1. AI extracts intent & location ("Ben Thanh Market").
2. Backend calls VietMap to get coordinates.
3. Backend searches DB for nearby places matching "cheap" budget.
4. AI synthesizes results into a natural conversation.

### Output
```json
{
    "reply": "Chào bạn! Từ Chợ Bến Thành, bạn có thể tản bộ đến khu vực Takashimaya, hoặc Bưu Điện Thành Phố và Nhà thờ Đức Bà. Xung quanh đó có rất nhiều lựa chọn ẩm thực phong phú và đa dạng để bạn khám phá.",
    "selected_locations": [
        {
            "id": "c9a96206-df10-43c0-8c82-baff6887a641",
            "name": "Takashimaya",
            "district": "District 1",
            "score": 0.7449176688438375
        },
        {
            "id": "a0ec37f3-e5f6-45e1-a5ad-d1f91beab075",
            "name": "Bưu Điện Thành Phố",
            "district": "District 1",
            "score": 0.7284865287153277
        },
        {
            "id": "6ab6e7a1-6447-4ab2-8293-e0f677d94137",
            "name": "Nhà thờ Đức Bà",
            "district": "District 1",
            "score": 0.7264759489655814
        }
    ]
}
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
    return apiPost("/users/", data);
}

export function getUser(id) {
    return apiGet(`/users/${id}`);
}

/* ---------------- LOCATIONS ---------------- */
export function getLocations() {
    return apiGet("/locations/");
}

/* ---------------- AI & RECOMMENDATIONS ---------------- */
export function getRecommendations(payload) {
    return apiPost("/recommend/route-aware", payload);
}

export function chatRecommend(payload) {
    return apiPost("/ai/recommend-chat", payload);
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
        user_id: "your-user-uuid-here",
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
* (NEW) Chatbot response generation