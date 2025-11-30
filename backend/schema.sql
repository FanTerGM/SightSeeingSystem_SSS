-- schema_from_models.sql (matches models.py, price_level = low/medium/high)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS itinerary_locations CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS location_categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  name_vi VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_vi VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  district VARCHAR(100),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone_number VARCHAR(20),
  website TEXT,
  price_level VARCHAR(10),
  average_visit_duration INTEGER,
  rating DOUBLE PRECISION,
  review_count INTEGER DEFAULT 0,
  opening_hours JSONB,
  closing_hours JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_price_level CHECK (price_level IN ('low', 'medium', 'high')),
  CONSTRAINT check_rating CHECK (rating >= 0 AND rating <= 5)
);

CREATE TABLE location_categories (
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (location_id, category_id)
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  visit_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_review_rating CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE itineraries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_point JSONB,
  end_point JSONB,
  total_distance DOUBLE PRECISION,
  estimated_duration INTEGER,
  trip_date DATE,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('draft', 'active', 'completed'))
);

CREATE TABLE itinerary_locations (
  id UUID PRIMARY KEY,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  visit_order INTEGER NOT NULL,
  distance_from_previous DOUBLE PRECISION,
  travel_time INTEGER,
  transport_mode VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_transport_mode CHECK (transport_mode IN ('walk', 'car', 'bus', 'grab'))
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  budget_level VARCHAR(20),
  preferred_categories UUID[],
  travel_pace VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_budget_level CHECK (budget_level IN ('low', 'medium', 'high')),
  CONSTRAINT check_travel_pace CHECK (travel_pace IN ('slow', 'moderate', 'fast'))
);

CREATE INDEX IF NOT EXISTS idx_locations_lat_lon ON locations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_district ON locations (district);
CREATE INDEX IF NOT EXISTS idx_reviews_location_id ON reviews (location_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);

DO $$
BEGIN
  RAISE NOTICE 'New schema created: price_level = (low, medium, high)';
END $$;
