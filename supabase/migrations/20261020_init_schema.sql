-- Ghar Ki Rasoi: PostgreSQL & PostGIS Schema (Idempotent)
-- Enables spatial discovery, dynamic menus, RBAC, orders, payments, subscriptions & delivery

BEGIN;

-- Safety check: if legacy orders table with integer/bigint exists and wasn't renamed yet,
-- archive it safely so UUID foreign key creation does not fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND data_type IN ('bigint', 'integer')
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'archive_legacy_orders'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.legacy_backup_orders AS SELECT * FROM public.orders;
    ALTER TABLE public.orders RENAME TO archive_legacy_orders;
    RAISE NOTICE 'Preserved legacy orders table (bigint ID) to archive_legacy_orders.';
  END IF;
END $$;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. User Roles Enum & Table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('CUSTOMER', 'COOK', 'DELIVERY_PARTNER', 'ADMIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- References auth.users(id) if Supabase Auth is active
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 3. Kitchens
CREATE TABLE IF NOT EXISTS kitchens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cook_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_text TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_geom GEOMETRY(Point, 4326),
  cuisine_types TEXT[] DEFAULT '{}',
  banner_url TEXT,
  is_veg_only BOOLEAN DEFAULT FALSE,
  is_open BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  prep_time_minutes INT DEFAULT 25,
  starting_price NUMERIC(10, 2) DEFAULT 80.00,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  total_ratings INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchens_geom ON kitchens USING GIST(location_geom);
CREATE INDEX IF NOT EXISTS idx_kitchens_owner ON kitchens(owner_id);

-- 4. Dynamic Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kitchen_id UUID NOT NULL REFERENCES kitchens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL, -- 'Sabzi', 'Roti', 'Rice', 'Daal', 'Thali', 'Snacks', 'Beverage', 'Dessert'
  image_url TEXT,
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  daily_quantity INT DEFAULT 30,
  sold_quantity INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_kitchen ON menu_items(kitchen_id);

-- 5. Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  address_line TEXT NOT NULL,
  landmark TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);

-- 6. Orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'PLACED',
      'AWAITING_KITCHEN',
      'ACCEPTED',
      'PREPARING',
      'PACKED',
      'RIDER_ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'ARRIVED_AT_CUSTOMER',
      'DELIVERED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  kitchen_id UUID NOT NULL REFERENCES kitchens(id),
  status order_status NOT NULL DEFAULT 'PLACED',
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) DEFAULT 30.00,
  platform_fee NUMERIC(10, 2) DEFAULT 10.00,
  tax NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,
  customer_phone TEXT NOT NULL,
  special_instructions TEXT,
  rejection_reason TEXT,
  estimated_delivery_time TIMESTAMPTZ,
  delivery_otp VARCHAR(6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_kitchen ON orders(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 8. Order Status Events (Audit & Tracking Timeline)
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note TEXT,
  actor_id UUID REFERENCES profiles(id),
  actor_role app_role,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

-- 9. Payments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  gateway TEXT NOT NULL DEFAULT 'RAZORPAY', -- 'RAZORPAY' or 'DEMO_SIMULATOR'
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 10. Delivery Partners
CREATE TABLE IF NOT EXISTS delivery_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT DEFAULT 'Bike',
  vehicle_number TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  current_geom GEOMETRY(Point, 4326),
  total_deliveries INT DEFAULT 0,
  rating NUMERIC(3, 2) DEFAULT 4.9,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_partners_geom ON delivery_partners USING GIST(current_geom);
CREATE INDEX IF NOT EXISTS idx_delivery_partners_user ON delivery_partners(user_id);

-- 11. Delivery Assignments (With Atomic Assignment)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES delivery_partners(id),
  status assignment_status NOT NULL DEFAULT 'ACCEPTED',
  earnings NUMERIC(10, 2) DEFAULT 40.00,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  picked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order ON delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner ON delivery_assignments(partner_id);

-- 12. Tiffin Subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('WEEKLY', 'MONTHLY');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_slot') THEN
    CREATE TYPE meal_slot AS ENUM ('LUNCH', 'DINNER', 'BOTH');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  kitchen_id UUID NOT NULL REFERENCES kitchens(id),
  plan_type subscription_plan NOT NULL,
  meal_slot meal_slot NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  dietary_notes TEXT,
  total_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_kitchen ON subscriptions(kitchen_id);

-- 13. Reviews & Ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  kitchen_id UUID NOT NULL REFERENCES kitchens(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_reviews_order UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_kitchen ON reviews(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);

-- 14. PostGIS Geometry Trigger for Kitchens
CREATE OR REPLACE FUNCTION update_kitchen_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions, pg_temp;

DROP TRIGGER IF EXISTS trg_update_kitchen_geom ON kitchens;
CREATE TRIGGER trg_update_kitchen_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON kitchens
FOR EACH ROW EXECUTE FUNCTION update_kitchen_geom();

COMMIT;
