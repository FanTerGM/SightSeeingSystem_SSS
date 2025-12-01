# 📦 Services Package - Business Logic Layer

Thư mục này chứa các **Service Classes** để xử lý business logic và thao tác với database một cách có tổ chức.

---

## 📁 Cấu trúc

```
services/
├── __init__.py              # Package initialization
├── base_service.py          # Base class với CRUD chung
├── user_service.py          # User operations
├── category_service.py      # Category operations
├── location_service.py      # Location operations
├── review_service.py        # Review operations
├── itinerary_service.py     # Itinerary operations
├── examples.py              # Usage examples
└── README.md               # This file
```

---

## 🎯 Tại sao cần Service Layer?

### ❌ Không dùng Services (Bad Practice)
```python
# Direct database access trong API endpoint
@app.get("/users/{user_id}")
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    return user
```

**Vấn đề:**
- Business logic lẫn lộn với API code
- Khó test
- Duplicate code nhiều chỗ
- Khó maintain

### ✅ Dùng Services (Best Practice)
```python
# API endpoint sạch sẽ
@app.get("/users/{user_id}")
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

**Ưu điểm:**
- Business logic tách riêng
- Dễ test (mock service)
- Tái sử dụng code
- Dễ maintain và extend

---

## 📚 Service Classes

### 1. BaseService

Base class cung cấp các CRUD operations chung cho tất cả services.

**Methods:**
- `create(**kwargs)` - Tạo instance mới
- `get_by_id(id)` - Lấy theo ID
- `get_all(skip, limit)` - Lấy tất cả (có pagination)
- `update(id, **kwargs)` - Cập nhật
- `delete(id)` - Xóa
- `count()` - Đếm tổng
- `exists(id)` - Kiểm tra tồn tại

**Example:**
```python
from services import UserService

db = SessionLocal()
service = UserService(db)

# All services inherit these methods
user = service.get_by_id(user_id)
all_users = service.get_all(skip=0, limit=10)
total = service.count()
```

---

### 2. UserService

Quản lý users và user preferences.

**Specific Methods:**
- `create_user(email, full_name, phone_number)` - Tạo user
- `get_by_email(email)` - Lấy user theo email
- `update_user(user_id, full_name, phone_number)` - Update user
- `set_preferences(user_id, budget_level, categories, pace)` - Set preferences
- `get_preferences(user_id)` - Lấy preferences
- `get_user_with_preferences(user_id)` - Lấy user + preferences
- `search_users(query)` - Tìm kiếm users

**Example:**
```python
from services import UserService
from database import SessionLocal

db = SessionLocal()
service = UserService(db)

# Create user
user = service.create_user(
    email="john@example.com",
    full_name="John Doe",
    phone_number="+84901234567"
)

# Set preferences
service.set_preferences(
    user_id=user.id,
    budget_level="medium",
    preferred_categories=[cat1_id, cat2_id],
    travel_pace="moderate"
)

# Get user with preferences
data = service.get_user_with_preferences(user.id)
print(f"User: {data['user'].full_name}")
print(f"Budget: {data['preferences'].budget_level}")

db.close()
```

---

### 3. CategoryService

Quản lý categories và mối quan hệ với locations.

**Specific Methods:**
- `create_category(name, name_vi, icon)` - Tạo category
- `get_by_name(name)` - Lấy theo tên
- `get_locations_by_category(category_id)` - Lấy locations của category
- `count_locations_by_category(category_id)` - Đếm locations
- `get_all_with_counts()` - Lấy categories kèm số lượng locations
- `search_categories(query)` - Tìm kiếm categories

**Example:**
```python
from services import CategoryService

db = SessionLocal()
service = CategoryService(db)

# Create category
category = service.create_category(
    name="museum",
    name_vi="Bảo tàng",
    icon="museum_icon"
)

# Get locations in category
locations = service.get_locations_by_category(category.id, limit=10)
print(f"Found {len(locations)} museums")

# Get all categories with counts
cat_counts = service.get_all_with_counts()
for cat in cat_counts:
    print(f"{cat['name_vi']}: {cat['location_count']} locations")

db.close()
```

---

### 4. LocationService

Quản lý locations với advanced search và geospatial queries.

**Specific Methods:**
- `create_location(...)` - Tạo location với categories
- `add_category(location_id, category_id)` - Thêm category
- `remove_category(location_id, category_id)` - Xóa category
- `get_location_categories(location_id)` - Lấy categories của location
- `search_locations(query, filters...)` - Tìm kiếm nâng cao
- `find_nearby(lat, lng, radius_km, filters...)` - Tìm gần tọa độ
- `get_popular_locations(min_rating, min_reviews)` - Lấy locations phổ biến
- `get_statistics(location_id)` - Thống kê chi tiết

**Example:**
```python
from services import LocationService

db = SessionLocal()
service = LocationService(db)

# Create location
location = service.create_location(
    name="War Remnants Museum",
    name_vi="Bảo tàng Chứng tích Chiến tranh",
    address="28 Võ Văn Tần, Q.3",
    latitude=10.7797,
    longitude=106.6918,
    price_level="₫",
    average_visit_duration=120,
    category_ids=[museum_cat_id]
)

# Search with filters
results = service.search_locations(
    query="museum",
    district="Quận 3",
    min_rating=4.0,
    price_level="₫"
)

# Find nearby locations
nearby = service.find_nearby(
    latitude=10.7720,
    longitude=106.6981,
    radius_km=2.0,
    min_rating=4.0
)
for loc in nearby:
    print(f"{loc['name_vi']}: {loc['distance_km']}km away")

# Get popular locations
popular = service.get_popular_locations(min_rating=4.5)

db.close()
```

---

### 5. ReviewService

Quản lý reviews và tự động cập nhật location ratings.

**Specific Methods:**
- `create_review(user_id, location_id, rating, comment, date)` - Tạo review
- `get_user_review(user_id, location_id)` - Lấy review của user
- `update_review(review_id, rating, comment)` - Update review
- `get_location_reviews(location_id, sort_by)` - Lấy reviews của location
- `get_user_reviews(user_id)` - Lấy reviews của user
- `get_review_statistics(location_id)` - Thống kê reviews
- `get_top_reviewers(limit)` - Lấy top reviewers
- `get_recent_reviews(limit)` - Lấy reviews gần đây

**Example:**
```python
from services import ReviewService
from datetime import date

db = SessionLocal()
service = ReviewService(db)

# Create review
review = service.create_review(
    user_id=user_id,
    location_id=location_id,
    rating=5,
    comment="Amazing place!",
    visit_date=date(2024, 11, 20)
)

# Get location reviews sorted by rating
reviews = service.get_location_reviews(
    location_id=location_id,
    sort_by='rating_high',
    limit=10
)

# Get statistics
stats = service.get_review_statistics(location_id)
print(f"Average: {stats['average_rating']}★")
print(f"Distribution: {stats['rating_distribution']}")
print(f"5-star: {stats['percentage_distribution'][5]}%")

# Get top reviewers
top = service.get_top_reviewers(limit=5)
for reviewer in top:
    print(f"{reviewer['full_name']}: {reviewer['review_count']} reviews")

db.close()
```

---

### 6. ItineraryService

Quản lý travel itineraries và routes.

**Specific Methods:**
- `create_itinerary(user_id, name, start, end, date)` - Tạo itinerary
- `add_location_to_itinerary(itin_id, loc_id, order, distance, time)` - Thêm location
- `remove_location_from_itinerary(itin_id, loc_id)` - Xóa location
- `get_itinerary_locations(itin_id)` - Lấy locations trong itinerary
- `get_user_itineraries(user_id, status)` - Lấy itineraries của user
- `update_itinerary_status(itin_id, status)` - Update status
- `get_itinerary_details(itin_id)` - Lấy chi tiết đầy đủ
- `duplicate_itinerary(itin_id, new_name)` - Duplicate itinerary

**Example:**
```python
from services import ItineraryService
from datetime import date

db = SessionLocal()
service = ItineraryService(db)

# Create itinerary
itinerary = service.create_itinerary(
    user_id=user_id,
    name="District 1 Day Trip",
    description="Explore District 1",
    start_point={"lat": 10.7720, "lng": 106.6981, "name": "Ben Thanh"},
    trip_date=date(2024, 12, 15),
    status='draft'
)

# Add locations
service.add_location_to_itinerary(
    itinerary_id=itinerary.id,
    location_id=location1_id,
    visit_order=1,
    distance_from_previous=0,
    travel_time=0,
    transport_mode='walk'
)

service.add_location_to_itinerary(
    itinerary_id=itinerary.id,
    location_id=location2_id,
    visit_order=2,
    distance_from_previous=1.5,
    travel_time=10,
    transport_mode='grab'
)

# Get details
details = service.get_itinerary_details(itinerary.id)
print(f"Total stops: {details['total_stops']}")
print(f"Total distance: {details['itinerary'].total_distance}km")
print(f"Duration: {details['itinerary'].estimated_duration} mins")

# Update status
service.update_itinerary_status(itinerary.id, 'active')

db.close()
```

---

## 🚀 Cách sử dụng

### Pattern 1: Basic CRUD

```python
from database import SessionLocal
from services import UserService

db = SessionLocal()
service = UserService(db)

# Create
user = service.create_user(email="test@test.com", full_name="Test")

# Read
user = service.get_by_id(user_id)
all_users = service.get_all(skip=0, limit=10)

# Update
updated = service.update_user(user_id, full_name="New Name")

# Delete
success = service.delete(user_id)

db.close()
```

### Pattern 2: Complex Queries

```python
from database import SessionLocal
from services import LocationService, CategoryService

db = SessionLocal()
loc_service = LocationService(db)
cat_service = CategoryService(db)

# Get category ID
cafe_cat = cat_service.get_by_name("cafe")

# Find nearby cafes with high ratings
nearby_cafes = loc_service.find_nearby(
    latitude=10.7720,
    longitude=106.6981,
    radius_km=2.0,
    category_ids=[cafe_cat.id],
    min_rating=4.0
)

for cafe in nearby_cafes:
    print(f"{cafe['name_vi']}: {cafe['rating']}★, {cafe['distance_km']}km")

db.close()
```

### Pattern 3: Multiple Services

```python
from database import SessionLocal
from services import UserService, ReviewService, LocationService

db = SessionLocal()
user_service = UserService(db)
review_service = ReviewService(db)
location_service = LocationService(db)

# Get user
user = user_service.get_by_email("john@example.com")

# Get user's reviews
reviews = review_service.get_user_reviews(user.id)

# Get locations user reviewed
for review in reviews:
    location = location_service.get_by_id(review.location_id)
    print(f"{location.name_vi}: {review.rating}★")

db.close()
```

---

## 📖 Examples

Xem file `examples.py` để có ví dụ đầy đủ về tất cả operations:

```bash
cd backend
python -m services.examples
```

Output sẽ hiển thị:
- User operations (create, update, preferences)
- Category operations (create, search, count locations)
- Location operations (create, search, nearby, popular)
- Review operations (create, statistics, top reviewers)
- Itinerary operations (create, add locations, duplicate)
- Advanced queries (combining multiple services)

---

## 🏗️ Architecture Pattern

```
┌─────────────────────────────────────┐
│         API Layer (main.py)         │
│  - FastAPI endpoints                │
│  - Request/Response handling        │
│  - Authentication                   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      Service Layer (services/)      │
│  - Business logic                   │
│  - Data validation                  │
│  - Complex queries                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│    Data Layer (models.py + DB)      │
│  - SQLAlchemy ORM                   │
│  - Database operations              │
│  - Relationships                    │
└─────────────────────────────────────┘
```

---

## 🎯 Best Practices

### ✅ DO:
```python
# 1. Always use services in API endpoints
@app.get("/users/{user_id}")
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_by_id(user_id)

# 2. Close database session
db = SessionLocal()
service = UserService(db)
# ... operations ...
db.close()

# 3. Use with statement for auto-close
def get_user_data(user_id):
    db = SessionLocal()
    try:
        service = UserService(db)
        return service.get_by_id(user_id)
    finally:
        db.close()

# 4. Handle errors gracefully
user = service.create_user(email="test@test.com", full_name="Test")
if not user:
    print("Failed to create user (email may exist)")
```

### ❌ DON'T:
```python
# 1. Don't access database directly in API
@app.get("/users/{user_id}")
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(User).filter(User.id == user_id).first()  # BAD

# 2. Don't forget to close database
db = SessionLocal()
service = UserService(db)
# ... operations ...
# FORGOT db.close()  # BAD - memory leak

# 3. Don't ignore error handling
user = service.create_user(...)  # May return None
print(user.email)  # BAD - AttributeError if None
```

---

## 🧪 Testing Services

```python
import pytest
from services import UserService
from database import SessionLocal

def test_create_user():
    db = SessionLocal()
    service = UserService(db)
    
    user = service.create_user(
        email="test@pytest.com",
        full_name="Test User"
    )
    
    assert user is not None
    assert user.email == "test@pytest.com"
    
    # Cleanup
    service.delete(user.id)
    db.close()
```

---

## 📚 Tài liệu thêm

- `base_service.py` - Xem để hiểu CRUD operations
- `examples.py` - Chạy để xem full examples
- `../models.py` - Xem database models
- `../main.py` - Xem cách dùng trong API

---

## 🎓 Learning Path

1. **Bắt đầu:** Đọc `base_service.py` để hiểu common operations
2. **Tiếp theo:** Xem `user_service.py` để hiểu specific methods
3. **Thực hành:** Chạy `python -m services.examples`
4. **Nâng cao:** Xem `location_service.py` cho advanced queries
5. **Tích hợp:** Xem `main.py` để dùng services trong API

---

**Happy coding! 🚀**
