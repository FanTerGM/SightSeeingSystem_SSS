"""
Test script for SSS API endpoints
Run this after starting the server
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_health():
    print_section("Testing Health Check")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_categories():
    print_section("Testing Categories")
    response = requests.get(f"{BASE_URL}/api/categories")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total categories: {len(data)}")
    for cat in data[:3]:
        print(f"  - {cat['name_vi']} ({cat['name']})")

def test_locations():
    print_section("Testing Locations")
    response = requests.get(f"{BASE_URL}/api/locations?limit=5")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total locations: {len(data)}")
    for loc in data:
        print(f"  - {loc['name_vi']}")
        print(f"    Rating: {loc['rating']}, Price: {loc['price_level']}")

def test_nearby():
    print_section("Testing Nearby Search")
    # Tọa độ gần Chợ Bến Thành
    params = {
        "latitude": 10.7720,
        "longitude": 106.6981,
        "radius_km": 2,
        "limit": 5
    }
    response = requests.get(f"{BASE_URL}/api/locations/nearby", params=params)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Found {data['count']} locations within 2km:")
    for loc in data['results']:
        print(f"  - {loc['name_vi']} ({loc['distance_km']} km)")

def test_stats():
    print_section("Testing Statistics")
    response = requests.get(f"{BASE_URL}/api/stats")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(json.dumps(data, indent=2))

def test_create_user():
    print_section("Testing User Creation")
    user_data = {
        "email": "testuser@sss.com",
        "full_name": "Test User 2",
        "phone_number": "+84987654321"
    }
    response = requests.post(f"{BASE_URL}/api/users", json=user_data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2, default=str))
    else:
        print(response.json())

def main():
    print("\n" + "🧪 SSS API Test Suite".center(60))
    print("Testing endpoints at:", BASE_URL)
    
    try:
        # Run all tests
        test_health()
        test_categories()
        test_locations()
        test_nearby()
        test_stats()
        test_create_user()
        
        print("\n" + "✅ All tests completed!".center(60))
        print("\n📖 View full API documentation at:")
        print(f"   {BASE_URL}/docs\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Cannot connect to API server")
        print("Please make sure the server is running:")
        print("  cd backend && python main.py")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
