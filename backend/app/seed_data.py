"""
Seed data for testing the SSS database
thêm dữ liệu để test database
"""
import psycopg2
from psycopg2.extras import Json
import os
from dotenv import load_dotenv

load_dotenv()

# HCM City famous locations
SEED_DATA = {
    "categories": [
        {"name": "museum", "name_vi": "Bảo tàng", "icon": "museum"},
        {"name": "restaurant", "name_vi": "Nhà hàng", "icon": "restaurant"},
        {"name": "cafe", "name_vi": "Quán cà phê", "icon": "cafe"},
        {"name": "park", "name_vi": "Công viên", "icon": "park"},
        {"name": "shopping", "name_vi": "Mua sắm", "icon": "shopping_bag"},
        {"name": "landmark", "name_vi": "Địa danh", "icon": "place"},
        {"name": "entertainment", "name_vi": "Giải trí", "icon": "local_activity"},
    ],
    "locations": [
        {
            "name": "Ben Thanh Market",
            "name_vi": "Chợ Bến Thành",
            "description": "Historic market in the heart of Saigon, famous for shopping and local food",
            "address": "Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7720,
            "longitude": 106.6981,
            "phone_number": "028 3829 9274",
            "price_level": "₫₫",
            "average_visit_duration": 90,
            "rating": 4.3,
            "opening_hours": {"mon": "06:00", "tue": "06:00", "wed": "06:00", "thu": "06:00", "fri": "06:00", "sat": "06:00", "sun": "06:00"},
            "closing_hours": {"mon": "18:00", "tue": "18:00", "wed": "18:00", "thu": "18:00", "fri": "18:00", "sat": "18:00", "sun": "18:00"},
            "categories": ["shopping", "landmark"]
        },
        {
            "name": "Notre-Dame Cathedral Basilica of Saigon",
            "name_vi": "Nhà thờ Đức Bà Sài Gòn",
            "description": "Beautiful French colonial cathedral built in the late 1800s",
            "address": "01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7797,
            "longitude": 106.6991,
            "price_level": "free",
            "average_visit_duration": 30,
            "rating": 4.6,
            "opening_hours": {"mon": "08:00", "tue": "08:00", "wed": "08:00", "thu": "08:00", "fri": "08:00", "sat": "08:00", "sun": "08:00"},
            "closing_hours": {"mon": "17:00", "tue": "17:00", "wed": "17:00", "thu": "17:00", "fri": "17:00", "sat": "17:00", "sun": "17:00"},
            "categories": ["landmark"]
        },
        {
            "name": "War Remnants Museum",
            "name_vi": "Bảo tàng Chứng tích Chiến tranh",
            "description": "Museum documenting the Vietnam War with photos, weapons and military equipment",
            "address": "28 Võ Văn Tần, Phường 6, Quận 3, TP.HCM",
            "district": "Quận 3",
            "latitude": 10.7797,
            "longitude": 106.6918,
            "phone_number": "028 3930 5587",
            "price_level": "₫",
            "average_visit_duration": 120,
            "rating": 4.5,
            "opening_hours": {"mon": "07:30", "tue": "07:30", "wed": "07:30", "thu": "07:30", "fri": "07:30", "sat": "07:30", "sun": "07:30"},
            "closing_hours": {"mon": "18:00", "tue": "18:00", "wed": "18:00", "thu": "18:00", "fri": "18:00", "sat": "18:00", "sun": "18:00"},
            "categories": ["museum"]
        },
        {
            "name": "Saigon Central Post Office",
            "name_vi": "Bưu điện Trung tâm Sài Gòn",
            "description": "Historic post office with beautiful French colonial architecture",
            "address": "2 Công xã Paris, Bến Nghé, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7799,
            "longitude": 106.7000,
            "phone_number": "028 3822 1677",
            "price_level": "free",
            "average_visit_duration": 20,
            "rating": 4.4,
            "opening_hours": {"mon": "07:00", "tue": "07:00", "wed": "07:00", "thu": "07:00", "fri": "07:00", "sat": "07:00", "sun": "08:00"},
            "closing_hours": {"mon": "19:00", "tue": "19:00", "wed": "19:00", "thu": "19:00", "fri": "19:00", "sat": "19:00", "sun": "18:00"},
            "categories": ["landmark"]
        },
        {
            "name": "Independence Palace",
            "name_vi": "Dinh Độc Lập",
            "description": "Historic palace and museum showcasing Vietnam's political history",
            "address": "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7769,
            "longitude": 106.6955,
            "phone_number": "028 3822 3652",
            "price_level": "₫",
            "average_visit_duration": 90,
            "rating": 4.5,
            "opening_hours": {"mon": "07:30", "tue": "07:30", "wed": "07:30", "thu": "07:30", "fri": "07:30", "sat": "07:30", "sun": "07:30"},
            "closing_hours": {"mon": "11:00", "tue": "11:00", "wed": "11:00", "thu": "11:00", "fri": "11:00", "sat": "11:00", "sun": "11:00"},
            "categories": ["landmark", "museum"]
        },
        {
            "name": "The Cafe Apartment",
            "name_vi": "Chung cư Cafe",
            "description": "Unique building with 9 floors of different cafes and shops",
            "address": "42 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7743,
            "longitude": 106.7042,
            "price_level": "₫₫",
            "average_visit_duration": 60,
            "rating": 4.2,
            "opening_hours": {"mon": "08:00", "tue": "08:00", "wed": "08:00", "thu": "08:00", "fri": "08:00", "sat": "08:00", "sun": "08:00"},
            "closing_hours": {"mon": "22:00", "tue": "22:00", "wed": "22:00", "thu": "22:00", "fri": "22:00", "sat": "23:00", "sun": "23:00"},
            "categories": ["cafe", "shopping"]
        },
        {
            "name": "Bitexco Financial Tower",
            "name_vi": "Tòa nhà Bitexco Financial Tower",
            "description": "Iconic skyscraper with Saigon Skydeck observation deck on 49th floor",
            "address": "36 Hồ Tùng Mậu, Bến Nghé, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7717,
            "longitude": 106.7036,
            "phone_number": "028 3915 6156",
            "price_level": "₫₫",
            "average_visit_duration": 60,
            "rating": 4.4,
            "opening_hours": {"mon": "09:30", "tue": "09:30", "wed": "09:30", "thu": "09:30", "fri": "09:30", "sat": "09:30", "sun": "09:30"},
            "closing_hours": {"mon": "21:30", "tue": "21:30", "wed": "21:30", "thu": "21:30", "fri": "21:30", "sat": "21:30", "sun": "21:30"},
            "categories": ["landmark", "entertainment"]
        },
        {
            "name": "Tao Dan Park",
            "name_vi": "Công viên Tao Đàn",
            "description": "Peaceful green park perfect for morning exercise and relaxation",
            "address": "Trương Định, Phường Bến Thành, Quận 1, TP.HCM",
            "district": "Quận 1",
            "latitude": 10.7820,
            "longitude": 106.6935,
            "price_level": "free",
            "average_visit_duration": 45,
            "rating": 4.3,
            "opening_hours": {"mon": "05:00", "tue": "05:00", "wed": "05:00", "thu": "05:00", "fri": "05:00", "sat": "05:00", "sun": "05:00"},
            "closing_hours": {"mon": "21:00", "tue": "21:00", "wed": "21:00", "thu": "21:00", "fri": "21:00", "sat": "21:00", "sun": "21:00"},
            "categories": ["park"]
        }
    ],
    "users": [
        {
            "email": "test@sss.com",
            "full_name": "Test User",
            "phone_number": "+84901234567"
        }
    ]
}

def seed_database():
    """Seed the database with initial data"""
    conn = psycopg2.connect(
        host="localhost",
        database="sss_db",
        user="sss_user",
        password="sss_password"
    )
    cur = conn.cursor()
    
    try:
        print("🌱 Starting database seeding...")
        
        # Seed categories
        print("\n📂 Seeding categories...")
        category_ids = {}
        for cat in SEED_DATA["categories"]:
            cur.execute("""
                INSERT INTO categories (name, name_vi, icon)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (cat["name"], cat["name_vi"], cat["icon"]))
            category_ids[cat["name"]] = cur.fetchone()[0]
            print(f"  ✓ {cat['name_vi']}")
        
        # Seed users
        print("\n👤 Seeding users...")
        user_ids = {}
        for user in SEED_DATA["users"]:
            cur.execute("""
                INSERT INTO users (email, full_name, phone_number)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (user["email"], user["full_name"], user["phone_number"]))
            user_ids[user["email"]] = cur.fetchone()[0]
            print(f"  ✓ {user['full_name']}")
        
        # Seed locations
        print("\n📍 Seeding locations...")
        for loc in SEED_DATA["locations"]:
            # Insert location
            cur.execute("""
                INSERT INTO locations (
                    name, name_vi, description, address, district,
                    latitude, longitude, phone_number, price_level,
                    average_visit_duration, rating, opening_hours, closing_hours
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                loc["name"], loc["name_vi"], loc["description"],
                loc["address"], loc["district"], loc["latitude"], loc["longitude"],
                loc.get("phone_number"), loc["price_level"],
                loc["average_visit_duration"], loc["rating"],
                Json(loc["opening_hours"]), Json(loc["closing_hours"])
            ))
            location_id = cur.fetchone()[0]
            
            # Link categories
            for cat_name in loc["categories"]:
                cur.execute("""
                    INSERT INTO location_categories (location_id, category_id)
                    VALUES (%s, %s)
                """, (location_id, category_ids[cat_name]))
            
            print(f"  ✓ {loc['name_vi']}")
        
        conn.commit()
        print("\n✅ Database seeding completed successfully!")
        
        # Print summary
        cur.execute("SELECT COUNT(*) FROM categories")
        cat_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM locations")
        loc_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        
        print(f"\n📊 Summary:")
        print(f"  Categories: {cat_count}")
        print(f"  Locations: {loc_count}")
        print(f"  Users: {user_count}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_database()
