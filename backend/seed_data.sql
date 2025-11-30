---------------------------------------------------------------
-- ENABLE UUID EXTENSION
---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------------
-- RESET TABLES
---------------------------------------------------------------
TRUNCATE TABLE itinerary_locations, itineraries, reviews, location_categories,
           user_preferences, locations, categories, users
RESTART IDENTITY CASCADE;

SET client_encoding = 'UTF8';

---------------------------------------------------------------
-- INSERT USER
---------------------------------------------------------------
WITH new_user AS (
    INSERT INTO users (id, email, full_name, phone_number)
    VALUES (
        uuid_generate_v4(),
        'user@example.com',
        'Test User',
        '0123456789'
    )
    RETURNING id
)
SELECT id INTO TEMP TABLE tmp_user FROM new_user;


---------------------------------------------------------------
-- INSERT CATEGORIES
---------------------------------------------------------------
WITH new_cat AS (
    INSERT INTO categories (id, name, name_vi, icon) VALUES
    (uuid_generate_v4(), 'Historical', 'Lịch sử', '🏛️'),
    (uuid_generate_v4(), 'Entertainment', 'Giải trí', '🎡'),
    (uuid_generate_v4(), 'Café', 'Quán cà phê', '☕'),
    (uuid_generate_v4(), 'Shopping', 'Mua sắm', '🛍️')
    RETURNING id
)
SELECT id INTO TEMP TABLE tmp_cat FROM new_cat;


---------------------------------------------------------------
-- INSERT LOCATIONS (8 địa điểm)
---------------------------------------------------------------
WITH new_loc AS (
    INSERT INTO locations (
        id, name, name_vi, description, address, district,
        latitude, longitude,
        phone_number, website,
        price_level, average_visit_duration,
        rating, review_count,
        opening_hours, closing_hours
    )
    VALUES
    (
        uuid_generate_v4(), 'Notre Dame Cathedral', 'Nhà thờ Đức Bà',
        'Famous cathedral in HCMC.',
        '01 Paris Square', 'District 1',
        10.77978, 106.69902,
        '0123456789', 'https://notredame.vn',
        'medium', 40, 4.7, 1500,
        '{"open":"07:00"}', '{"close":"18:00"}'
    ),
    (
        uuid_generate_v4(), 'Central Post Office', 'Bưu Điện Thành Phố',
        'Historic French post office.',
        '02 Paris Square', 'District 1',
        10.7805, 106.6994,
        '0987654321', 'https://postoffice.vn',
        'low', 30, 4.8, 2000,
        '{"open":"08:00"}', '{"close":"17:30"}'
    ),
    (
        uuid_generate_v4(), 'Nguyen Hue Walking Street', 'Phố đi bộ Nguyễn Huệ',
        'Popular walking street.',
        'Nguyen Hue', 'District 1',
        10.7724, 106.7042,
        NULL, NULL,
        'medium', 60, 4.6, 3500,
        '{"open":"00:00"}', '{"close":"23:59"}'
    ),
    (
        uuid_generate_v4(), 'Landmark 81 SkyView', 'Landmark 81 SkyView',
        'Tallest building in Vietnam.',
        '208 Nguyễn Hữu Cảnh', 'Bình Thạnh',
        10.7943, 106.7225,
        NULL, 'https://landmark81.vn',
        'high', 120, 4.9, 5200,
        '{"open":"09:00"}', '{"close":"22:00"}'
    ),
    (
        uuid_generate_v4(), 'Nha Rong Wharf', 'Bến Nhà Rồng',
        'Historic site by the river.',
        '1 Nguyễn Tất Thành', 'District 4',
        10.7671, 106.7076,
        NULL, NULL,
        'low', 30, 4.5, 800,
        '{"open":"07:30"}', '{"close":"17:00"}'
    ),
    (
        uuid_generate_v4(), 'War Remnants Museum', 'Bảo tàng Chứng tích chiến tranh',
        'Popular museum.',
        '28 Võ Văn Tần', 'District 3',
        10.7790, 106.6923,
        NULL, NULL,
        'medium', 90, 4.7, 4500,
        '{"open":"07:30"}', '{"close":"18:00"}'
    ),
    (
        uuid_generate_v4(), 'Takashimaya', 'Takashimaya',
        'Luxury shopping center.',
        '92 Nam Kỳ Khởi Nghĩa', 'District 1',
        10.7734, 106.6990,
        NULL, 'https://takashimaya.vn',
        'high', 90, 4.6, 3900,
        '{"open":"09:30"}', '{"close":"22:00"}'
    ),
    (
        uuid_generate_v4(), 'Highlands Coffee Nguyen Hue', 'Highlands Coffee Nguyễn Huệ',
        'Popular café.',
        'Nguyen Hue', 'District 1',
        10.7728, 106.7040,
        NULL, 'https://highlandscoffee.com.vn',
        'low', 45, 4.2, 900,
        '{"open":"06:30"}', '{"close":"22:00"}'
    )
    RETURNING id
)
SELECT id INTO TEMP TABLE tmp_loc FROM new_loc;


---------------------------------------------------------------
-- RANDOM CATEGORY ASSIGNMENT
---------------------------------------------------------------
INSERT INTO location_categories (location_id, category_id)
SELECT l.id, c.id
FROM tmp_loc l, tmp_cat c
WHERE random() > 0.5;


---------------------------------------------------------------
-- USER PREFERENCES
---------------------------------------------------------------
INSERT INTO user_preferences (id, user_id, budget_level, preferred_categories, travel_pace)
SELECT
    uuid_generate_v4(),
    (SELECT id FROM tmp_user),
    'medium',
    ARRAY(SELECT id FROM tmp_cat LIMIT 2),
    'moderate';


---------------------------------------------------------------
-- REVIEWS
---------------------------------------------------------------
INSERT INTO reviews (id, location_id, user_id, rating, comment, visit_date)
SELECT
    uuid_generate_v4(),
    l.id,
    (SELECT id FROM tmp_user),
    (3 + floor(random() * 3))::int,
    'Nice place!',
    CURRENT_DATE - (1 + floor(random() * 10))::int
FROM tmp_loc l
WHERE random() > 0.5;

---------------------------------------------------------------
-- DONE
---------------------------------------------------------------
SELECT 'SEED COMPLETED SUCCESSFULLY!' AS status;
