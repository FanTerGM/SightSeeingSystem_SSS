-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS itinerary_locations CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS location_categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- CORE TABLES
-- ============================================

-- Bảng người dùng
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phân loại
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(100) UNIQUE NOT NULL,
    name_vi VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng địa điểm
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_vi VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    district VARCHAR(100),
    
    -- Tọa độ
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Thông tin cơ bản
    phone_number VARCHAR(20),
    website TEXT,
    price_level VARCHAR(10) CHECK (price_level IN ('free', '₫', '₫₫', '₫₫₫')),
    average_visit_duration INTEGER, -- phút
    
    -- Rating
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    
    -- Thời gian hoạt động
    opening_hours JSONB,
    closing_hours JSONB,
    
    -- Trạng thái
    is_active BOOLEAN DEFAULT TRUE,
    
    -- thời gian tạo và cập nhật
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction: Locations - Categories (Many-to-Many)
CREATE TABLE location_categories (
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    
    PRIMARY KEY (location_id, category_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng đánh giá
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    visit_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, user_id)
);

-- Bảng hành trình
CREATE TABLE itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Thông tin chuyến đi
    start_point JSONB, -- {lat, lng, name}
    end_point JSONB,
    total_distance DECIMAL(10, 2), -- km
    estimated_duration INTEGER, -- phút
    
    -- Lập kế hoạch
    trip_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction: Itineraries - Locations (Many-to-Many)
CREATE TABLE itinerary_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Thứ tự trong hành trình
    visit_order INTEGER NOT NULL,
    
    -- Thông tin di chuyển
    distance_from_previous DECIMAL(10, 2), -- km
    travel_time INTEGER, -- phút
    transport_mode VARCHAR(20) CHECK (transport_mode IN ('walk', 'car', 'bus', 'grab')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(itinerary_id, location_id),
    UNIQUE(itinerary_id, visit_order)
);

-- Bảng sở thích người dùng
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    budget_level VARCHAR(20) CHECK (budget_level IN ('low', 'medium', 'high')),
    preferred_categories UUID[], -- Array of category IDs
    travel_pace VARCHAR(20) CHECK (travel_pace IN ('slow', 'moderate', 'fast')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Locations
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX idx_locations_rating ON locations(rating DESC) WHERE is_active = TRUE;
CREATE INDEX idx_locations_district ON locations(district);
CREATE INDEX idx_locations_price ON locations(price_level) WHERE is_active = TRUE;

-- Reviews
CREATE INDEX idx_reviews_location ON reviews(location_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- Itineraries
CREATE INDEX idx_itineraries_user ON itineraries(user_id);
CREATE INDEX idx_itineraries_status ON itineraries(status);
CREATE INDEX idx_itineraries_trip_date ON itineraries(trip_date);

-- Junction tables
CREATE INDEX idx_location_categories_location ON location_categories(location_id);
CREATE INDEX idx_location_categories_category ON location_categories(category_id);
CREATE INDEX idx_itinerary_locations_itinerary ON itinerary_locations(itinerary_id);
CREATE INDEX idx_itinerary_locations_location ON itinerary_locations(location_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at 
    BEFORE UPDATE ON itineraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update location rating from reviews
CREATE OR REPLACE FUNCTION update_location_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE locations
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM reviews
            WHERE location_id = NEW.location_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE location_id = NEW.location_id
        )
    WHERE id = NEW.location_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update location rating when review is added/updated
CREATE TRIGGER update_rating_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_location_rating();

-- ============================================
-- VIEWS
-- ============================================

-- View: Active locations with categories
CREATE VIEW active_locations_with_categories AS
SELECT 
    l.*,
    ARRAY_AGG(DISTINCT c.name) as category_names,
    ARRAY_AGG(DISTINCT c.id) as category_ids
FROM locations l
LEFT JOIN location_categories lc ON l.id = lc.location_id
LEFT JOIN categories c ON lc.category_id = c.id
WHERE l.is_active = TRUE
GROUP BY l.id;

-- View: Popular locations (high rating)
CREATE VIEW popular_locations AS
SELECT *
FROM locations
WHERE 
    is_active = TRUE 
    AND rating >= 4.0
    AND review_count >= 5
ORDER BY rating DESC, review_count DESC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Bảng lưu thông tin người dùng';
COMMENT ON TABLE categories IS 'Bảng phân loại địa điểm (cafe, restaurant, museum, etc.)';
COMMENT ON TABLE locations IS 'Bảng lưu thông tin các địa điểm tham quan';
COMMENT ON TABLE reviews IS 'Bảng đánh giá của người dùng cho địa điểm';
COMMENT ON TABLE itineraries IS 'Bảng lưu hành trình của người dùng';
COMMENT ON TABLE user_preferences IS 'Bảng lưu sở thích cá nhân của người dùng';

-- ============================================
-- GRANT PERMISSIONS (Optional)
-- ============================================

-- If you have a specific user for the application
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sss_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sss_user;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN 
    RAISE NOTICE '✅ SSS Database schema created successfully!';
    RAISE NOTICE '📊 Tables: users, categories, locations, reviews, itineraries, user_preferences';
    RAISE NOTICE '🔗 Junction tables: location_categories, itinerary_locations';
    RAISE NOTICE '📈 Indexes, triggers, and views created';
END $$;