import requests
import random

BASE_URL = "http://localhost:8000"


def get_first_location():
    r = requests.get(f"{BASE_URL}/api/locations")
    r.raise_for_status()
    locations = r.json()
    if not locations:
        raise ValueError("❌ No locations found in database.")
    return locations[0]["id"], locations[0]["name"]


def get_first_user():
    r = requests.get(f"{BASE_URL}/api/users")
    r.raise_for_status()
    users = r.json()
    if not users:
        raise ValueError("❌ No users found in database.")
    return users[0]["id"], users[0]["full_name"]


def test_create_review():
    print("\n=== STEP 1: Fetch UUIDs ===")

    loc_id, loc_name = get_first_location()
    user_id, user_name = get_first_user()

    print(f"📌 Using location: {loc_name} ({loc_id})")
    print(f"📌 Using user:     {user_name} ({user_id})")

    print("\n=== STEP 2: Send POST /api/reviews ===")

    review_payload = {
        "location_id": loc_id,
        "user_id": user_id,
        "rating": random.randint(3, 5),
        "comment": "Auto-test review",
        "visit_date": "2024-01-01",
    }

    r = requests.post(f"{BASE_URL}/api/reviews", json=review_payload)

    print("Status:", r.status_code)
    print("Response:", r.json())


def run_all_tests():
    print("\n========================================")
    print("     AUTO UUID API TEST STARTED")
    print("========================================")

    test_create_review()

    print("\n========================================")
    print("          TEST FINISHED")
    print("========================================")


if __name__ == "__main__":
    run_all_tests()
