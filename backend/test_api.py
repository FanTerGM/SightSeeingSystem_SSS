import requests

BASE_URL = "http://localhost:8000"


print("\n=== TEST: Categories ===")
r = requests.get(f"{BASE_URL}/api/categories")
print("Status:", r.status_code)
print("Data:", r.json())


print("\n=== TEST: Locations ===")
r = requests.get(f"{BASE_URL}/api/locations")
print("Status:", r.status_code)
print("Data:", r.json()[:2])  # print 2 items only


print("\n=== TEST: Create User ===")
new_user = {
    "email": "test@example.com",
    "full_name": "Test User",
    "phone_number": "0123456789",
}

r = requests.post(f"{BASE_URL}/api/users", json=new_user)
print("Status:", r.status_code)
print("Data:", r.json())


print("\n=== TEST: Create Review ===")
review = {
    "location_id": "PUT-UUID-HERE",
    "user_id": "PUT-UUID-HERE",
    "rating": 5,
    "comment": "Great place!",
}

# You should replace UUID manually from seeded items
# r = requests.post(f"{BASE_URL}/api/reviews", json=review)
# print(r.json())


print("\n=== TEST COMPLETED ===")
