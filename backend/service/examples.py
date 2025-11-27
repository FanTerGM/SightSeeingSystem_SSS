"""
Service Usage Examples

This file demonstrates how to use the service classes
to interact with the database.
"""

from datetime import date
from database import SessionLocal
from services import (
    UserService,
    CategoryService,
    LocationService,
    ReviewService,
    ItineraryService
)


def example_user_operations():
    """Examples of User operations"""
    print("\n" + "="*60)
    print("USER SERVICE EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    user_service = UserService(db)
    
    # 1. Create a new user
    print("\n1. Creating a new user...")
    user = user_service.create_user(
        email="alice@example.com",
        full_name="Alice Nguyen",
        phone_number="+84901234567"
    )
    if user:
        print(f"✓ Created user: {user.full_name} (ID: {user.id})")
    
    # 2. Get user by email
    print("\n2. Getting user by email...")
    user = user_service.get_by_email("alice@example.com")
    if user:
        print(f"✓ Found user: {user.full_name}")
    
    # 3. Update user information
    print("\n3. Updating user information...")
    updated_user = user_service.update_user(
        user_id=user.id,
        full_name="Alice Nguyen Smith",
        phone_number="+84987654321"
    )
    if updated_user:
        print(f"✓ Updated user: {updated_user.full_name}")
    
    # 4. Set user preferences
    print("\n4. Setting user preferences...")
    # First, get some category IDs
    cat_service = CategoryService(db)
    categories = cat_service.get_all()
    category_ids = [cat.id for cat in categories[:3]]  # First 3 categories
    
    pref = user_service.set_preferences(
        user_id=user.id,
        budget_level="medium",
        preferred_categories=category_ids,
        travel_pace="moderate"
    )
    if pref:
        print(f"✓ Set preferences: Budget={pref.budget_level}, Pace={pref.travel_pace}")
    
    # 5. Get user with preferences
    print("\n5. Getting user with preferences...")
    data = user_service.get_user_with_preferences(user.id)
    if data:
        print(f"✓ User: {data['user'].full_name}")
        if data['preferences']:
            print(f"  Budget: {data['preferences'].budget_level}")
            print(f"  Travel Pace: {data['preferences'].travel_pace}")
    
    # 6. Search users
    print("\n6. Searching users...")
    users = user_service.search_users("alice")
    print(f"✓ Found {len(users)} users matching 'alice'")
    
    db.close()


def example_category_operations():
    """Examples of Category operations"""
    print("\n" + "="*60)
    print("CATEGORY SERVICE EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    service = CategoryService(db)
    
    # 1. Create a new category
    print("\n1. Creating a new category...")
    category = service.create_category(
        name="beach",
        name_vi="Bãi biển",
        icon="beach_icon"
    )
    if category:
        print(f"✓ Created category: {category.name_vi}")
    
    # 2. Get all categories
    print("\n2. Getting all categories...")
    categories = service.get_all()
    print(f"✓ Found {len(categories)} categories")
    for cat in categories[:3]:
        print(f"  - {cat.name_vi} ({cat.name})")
    
    # 3. Get category by name
    print("\n3. Getting category by name...")
    cat = service.get_by_name("museum")
    if cat:
        print(f"✓ Found: {cat.name_vi}")
    
    # 4. Get locations by category
    print("\n4. Getting locations by category...")
    if cat:
        locations = service.get_locations_by_category(cat.id, limit=3)
        print(f"✓ Found {len(locations)} locations in {cat.name_vi}")
        for loc in locations:
            print(f"  - {loc.name_vi}")
    
    # 5. Get categories with location counts
    print("\n5. Getting categories with counts...")
    cat_counts = service.get_all_with_counts()
    for cat_data in cat_counts[:3]:
        print(f"  - {cat_data['name_vi']}: {cat_data['location_count']} locations")
    
    db.close()


def example_location_operations():
    """Examples of Location operations"""
    print("\n" + "="*60)
    print("LOCATION SERVICE EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    service = LocationService(db)
    cat_service = CategoryService(db)
    
    # Get a category ID for creating location
    museum_cat = cat_service.get_by_name("museum")
    
    # 1. Create a new location
    print("\n1. Creating a new location...")
    location = service.create_location(
        name="Saigon Opera House",
        name_vi="Nhà hát Lớn Sài Gòn",
        address="7 Lam Sơn Square, District 1",
        latitude=10.7769,
        longitude=106.7009,
        description="Beautiful French colonial opera house",
        district="Quận 1",
        price_level="₫₫",
        average_visit_duration=60,
        category_ids=[museum_cat.id] if museum_cat else []
    )
    if location:
        print(f"✓ Created location: {location.name_vi}")
    
    # 2. Search locations
    print("\n2. Searching locations...")
    locations = service.search_locations(
        query="museum",
        district="Quận 1",
        min_rating=4.0,
        limit=3
    )
    print(f"✓ Found {len(locations)} locations")
    for loc in locations:
        print(f"  - {loc.name_vi} (Rating: {loc.rating})")
    
    # 3. Find nearby locations
    print("\n3. Finding nearby locations...")
    nearby = service.find_nearby(
        latitude=10.7720,  # Near Ben Thanh Market
        longitude=106.6981,
        radius_km=1.0,
        limit=5
    )
    print(f"✓ Found {len(nearby)} locations within 1km")
    for loc in nearby:
        print(f"  - {loc['name_vi']}: {loc['distance_km']}km away")
    
    # 4. Get popular locations
    print("\n4. Getting popular locations...")
    popular = service.get_popular_locations(min_rating=4.0, limit=3)
    print(f"✓ Found {len(popular)} popular locations")
    for loc in popular:
        print(f"  - {loc.name_vi}: {loc.rating}★ ({loc.review_count} reviews)")
    
    # 5. Get location categories
    print("\n5. Getting location categories...")
    if locations:
        loc = locations[0]
        categories = service.get_location_categories(loc.id)
        print(f"✓ {loc.name_vi} has {len(categories)} categories:")
        for cat in categories:
            print(f"  - {cat.name_vi}")
    
    # 6. Get location statistics
    print("\n6. Getting location statistics...")
    if locations:
        stats = service.get_statistics(locations[0].id)
        if stats:
            print(f"✓ Statistics for {stats['name_vi']}:")
            print(f"  Total reviews: {stats['total_reviews']}")
            print(f"  Average rating: {stats['average_rating']}")
    
    db.close()


def example_review_operations():
    """Examples of Review operations"""
    print("\n" + "="*60)
    print("REVIEW SERVICE EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    service = ReviewService(db)
    user_service = UserService(db)
    location_service = LocationService(db)
    
    # Get a user and location
    user = user_service.get_by_email("test@sss.com")
    locations = location_service.get_all(limit=1)
    
    if not user or not locations:
        print("Need user and location for review examples")
        db.close()
        return
    
    location = locations[0]
    
    # 1. Create a review
    print("\n1. Creating a review...")
    review = service.create_review(
        user_id=user.id,
        location_id=location.id,
        rating=5,
        comment="Absolutely amazing place! Highly recommended.",
        visit_date=date(2024, 11, 15)
    )
    if review:
        print(f"✓ Created review: {review.rating}★")
    else:
        print("  Review may already exist")
    
    # 2. Get location reviews
    print("\n2. Getting location reviews...")
    reviews = service.get_location_reviews(location.id, limit=3)
    print(f"✓ Found {len(reviews)} reviews for {location.name_vi}")
    for rev in reviews:
        print(f"  - {rev.rating}★: {rev.comment[:50] if rev.comment else 'No comment'}...")
    
    # 3. Get review statistics
    print("\n3. Getting review statistics...")
    stats = service.get_review_statistics(location.id)
    if stats:
        print(f"✓ Review Statistics:")
        print(f"  Total reviews: {stats['total_reviews']}")
        print(f"  Average rating: {stats['average_rating']}★")
        print(f"  Rating distribution: {stats['rating_distribution']}")
    
    # 4. Get user reviews
    print("\n4. Getting user reviews...")
    user_reviews = service.get_user_reviews(user.id)
    print(f"✓ User has {len(user_reviews)} reviews")
    
    # 5. Get top reviewers
    print("\n5. Getting top reviewers...")
    top_reviewers = service.get_top_reviewers(limit=3)
    print(f"✓ Top {len(top_reviewers)} reviewers:")
    for reviewer in top_reviewers:
        print(f"  - {reviewer['full_name']}: {reviewer['review_count']} reviews")
    
    db.close()


def example_itinerary_operations():
    """Examples of Itinerary operations"""
    print("\n" + "="*60)
    print("ITINERARY SERVICE EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    service = ItineraryService(db)
    user_service = UserService(db)
    location_service = LocationService(db)
    
    # Get user and locations
    user = user_service.get_by_email("test@sss.com")
    locations = location_service.get_all(limit=3)
    
    if not user or not locations:
        print("Need user and locations for itinerary examples")
        db.close()
        return
    
    # 1. Create an itinerary
    print("\n1. Creating an itinerary...")
    itinerary = service.create_itinerary(
        user_id=user.id,
        name="District 1 Day Trip",
        description="A wonderful day exploring District 1",
        start_point={"lat": 10.7720, "lng": 106.6981, "name": "Ben Thanh Market"},
        end_point={"lat": 10.7720, "lng": 106.6981, "name": "Ben Thanh Market"},
        trip_date=date(2024, 12, 15),
        status='draft'
    )
    if itinerary:
        print(f"✓ Created itinerary: {itinerary.name}")
    
    # 2. Add locations to itinerary
    print("\n2. Adding locations to itinerary...")
    for i, location in enumerate(locations, 1):
        success = service.add_location_to_itinerary(
            itinerary_id=itinerary.id,
            location_id=location.id,
            visit_order=i,
            distance_from_previous=1.5 if i > 1 else 0,
            travel_time=10 if i > 1 else 0,
            transport_mode='grab'
        )
        if success:
            print(f"  ✓ Added: {location.name_vi}")
    
    # 3. Get itinerary locations
    print("\n3. Getting itinerary locations...")
    itin_locations = service.get_itinerary_locations(itinerary.id)
    print(f"✓ Itinerary has {len(itin_locations)} stops:")
    for loc_data in itin_locations:
        print(f"  {loc_data['visit_order']}. {loc_data['location'].name_vi}")
        if loc_data['distance_from_previous']:
            print(f"     Distance: {loc_data['distance_from_previous']}km")
    
    # 4. Get itinerary details
    print("\n4. Getting itinerary details...")
    details = service.get_itinerary_details(itinerary.id)
    if details:
        print(f"✓ Itinerary: {details['itinerary'].name}")
        print(f"  Total stops: {details['total_stops']}")
        print(f"  Total distance: {details['itinerary'].total_distance}km")
        print(f"  Estimated duration: {details['itinerary'].estimated_duration} minutes")
    
    # 5. Update itinerary status
    print("\n5. Updating itinerary status...")
    updated = service.update_itinerary_status(itinerary.id, 'active')
    if updated:
        print(f"✓ Status changed to: {updated.status}")
    
    # 6. Get user itineraries
    print("\n6. Getting user itineraries...")
    itineraries = service.get_user_itineraries(user.id)
    print(f"✓ User has {len(itineraries)} itineraries:")
    for itin in itineraries:
        print(f"  - {itin.name} ({itin.status})")
    
    # 7. Duplicate itinerary
    print("\n7. Duplicating itinerary...")
    duplicate = service.duplicate_itinerary(
        itinerary.id,
        new_name="District 1 Day Trip - Copy"
    )
    if duplicate:
        print(f"✓ Created duplicate: {duplicate.name}")
    
    db.close()


def example_advanced_queries():
    """Examples of advanced queries combining services"""
    print("\n" + "="*60)
    print("ADVANCED QUERY EXAMPLES")
    print("="*60)
    
    db = SessionLocal()
    
    # 1. Find highly-rated cafes near a location
    print("\n1. Finding highly-rated cafes near Ben Thanh...")
    location_service = LocationService(db)
    category_service = CategoryService(db)
    
    cafe_cat = category_service.get_by_name("cafe")
    if cafe_cat:
        nearby_cafes = location_service.find_nearby(
            latitude=10.7720,
            longitude=106.6981,
            radius_km=2.0,
            category_ids=[cafe_cat.id],
            min_rating=4.0
        )
        print(f"✓ Found {len(nearby_cafes)} cafes:")
        for cafe in nearby_cafes[:3]:
            print(f"  - {cafe['name_vi']}: {cafe['rating']}★, {cafe['distance_km']}km")
    
    # 2. Get user's reviewed locations
    print("\n2. Getting user's reviewed locations...")
    user_service = UserService(db)
    review_service = ReviewService(db)
    
    user = user_service.get_by_email("test@sss.com")
    if user:
        reviews = review_service.get_user_reviews(user.id)
        print(f"✓ User has reviewed {len(reviews)} locations:")
        for review in reviews[:3]:
            location = location_service.get_by_id(review.location_id)
            if location:
                print(f"  - {location.name_vi}: {review.rating}★")
    
    # 3. Get popular locations by category
    print("\n3. Getting popular museums...")
    museum_cat = category_service.get_by_name("museum")
    if museum_cat:
        museums = category_service.get_locations_by_category(museum_cat.id, limit=3)
        museums_sorted = sorted(museums, key=lambda x: x.rating or 0, reverse=True)
        print(f"✓ Top museums:")
        for museum in museums_sorted[:3]:
            print(f"  - {museum.name_vi}: {museum.rating}★")
    
    db.close()


def run_all_examples():
    """Run all example functions"""
    print("\n" + "="*60)
    print("SSS SERVICE LAYER EXAMPLES")
    print("Complete demonstration of all service classes")
    print("="*60)
    
    try:
        example_user_operations()
        example_category_operations()
        example_location_operations()
        example_review_operations()
        example_itinerary_operations()
        example_advanced_queries()
        
        print("\n" + "="*60)
        print("✅ ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_examples()
