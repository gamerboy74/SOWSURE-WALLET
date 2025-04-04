/*
  # Initial Schema Setup for FarmConnect
*/

-- Create farmers table (without wallet_address)
CREATE TABLE IF NOT EXISTS farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  farm_name text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create buyers table (without wallet_address)
CREATE TABLE IF NOT EXISTS buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- Policies for farmers
CREATE POLICY "Users can view own farmer profile" ON farmers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own farmer profile" ON farmers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own farmer profile" ON farmers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Policies for buyers
CREATE POLICY "Users can view own buyer profile" ON buyers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own buyer profile" ON buyers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buyer profile" ON buyers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own farmer profile" ON farmers;
DROP POLICY IF EXISTS "Users can create own farmer profile" ON farmers;
DROP POLICY IF EXISTS "Users can update own farmer profile" ON farmers;

-- Alter farmers table
ALTER TABLE farmers
  DROP COLUMN IF EXISTS farm_name,
  DROP COLUMN IF EXISTS location,
  ADD COLUMN IF NOT EXISTS phone_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS aadhar_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pan_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS farmer_id text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS complete_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pincode text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS land_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS land_size numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS land_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nominee_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add constraints
ALTER TABLE farmers
  ADD CONSTRAINT unique_email UNIQUE (email),
  ADD CONSTRAINT unique_aadhar_number UNIQUE (aadhar_number),
  ADD CONSTRAINT unique_pan_number UNIQUE (pan_number);

ALTER TABLE buyers ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '';

-- Recreate updated policies
CREATE POLICY "Users can view own farmer profile" ON farmers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own farmer profile" ON farmers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own farmer profile" ON farmers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow public to view farmer profiles" ON farmers FOR SELECT TO public USING (true);

-- Enhanced Buyer Registration Schema
DROP POLICY IF EXISTS "Users can view own buyer profile" ON buyers;
DROP POLICY IF EXISTS "Users can create own buyer profile" ON buyers;
DROP POLICY IF EXISTS "Users can update own buyer profile" ON buyers;

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS phone_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gstin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trade_license_url text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS purchase_capacity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storage_capacity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pincode text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE buyers ADD CONSTRAINT unique_gstin UNIQUE (gstin);

CREATE POLICY "Users can view own buyer profile" ON buyers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own buyer profile" ON buyers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buyer profile" ON buyers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('farmer-documents', 'farmer-documents', true),
  ('buyer-documents', 'buyer-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload farmer documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'farmer-documents' AND (auth.uid() IS NOT NULL));
CREATE POLICY "Anyone can view farmer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'farmer-documents');
CREATE POLICY "Authenticated users can upload buyer documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'buyer-documents' AND (auth.uid() IS NOT NULL));
CREATE POLICY "Anyone can view buyer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'buyer-documents');

-- Fix Storage Policies
DROP POLICY IF EXISTS "Authenticated users can upload farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload buyer documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view buyer documents" ON storage.objects;

UPDATE storage.buckets
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[]
WHERE id IN ('farmer-documents', 'buyer-documents');

CREATE POLICY "Public can view farmer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'farmer-documents');
CREATE POLICY "Authenticated users can upload farmer documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'farmer-documents' AND (auth.uid() IS NOT NULL));
CREATE POLICY "Users can update own farmer documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'farmer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own farmer documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'farmer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view buyer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'buyer-documents');
CREATE POLICY "Authenticated users can upload buyer documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'buyer-documents' AND (auth.uid() IS NOT NULL));
CREATE POLICY "Users can update own buyer documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own buyer documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Remove Authorization Requirements for File Uploads
DROP POLICY IF EXISTS "Public can view farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own farmer documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view buyer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload buyer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own buyer documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own buyer documents" ON storage.objects;

UPDATE storage.buckets
SET public = true,
    file_size_limit = null,
    allowed_mime_types = null
WHERE id IN ('farmer-documents', 'buyer-documents');

CREATE POLICY "Anyone can view farmer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'farmer-documents');
CREATE POLICY "Anyone can upload farmer documents" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'farmer-documents');
CREATE POLICY "Anyone can update farmer documents" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'farmer-documents');
CREATE POLICY "Anyone can delete farmer documents" ON storage.objects FOR DELETE TO public USING (bucket_id = 'farmer-documents');

CREATE POLICY "Anyone can view buyer documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'buyer-documents');
CREATE POLICY "Anyone can upload buyer documents" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'buyer-documents');
CREATE POLICY "Anyone can update buyer documents" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'buyer-documents');
CREATE POLICY "Anyone can delete buyer documents" ON storage.objects FOR DELETE TO public USING (bucket_id = 'buyer-documents');

-- Allow authenticated users to read farmer
CREATE POLICY "Allow authenticated users to read buyers" ON farmers
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to read buyers
CREATE POLICY "Allow authenticated users to read buyers" ON buyers
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to upload to product-images
CREATE POLICY "Authenticated users can upload to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete from product-images
CREATE POLICY "Authenticated users can delete from product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Add Initial Admin User and Setup
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN CREATE EXTENSION pgcrypto; END IF; END $$;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION check_auth_user_exists(email text) RETURNS boolean AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = check_auth_user_exists.email); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id uuid) RETURNS boolean AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = $1); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@farmconnect.com';
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@farmconnect.com', crypt('admin123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"type":"admin"}', now(), now(), '', '', '', '')
    RETURNING id INTO admin_user_id;
  END IF;
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO admin_users (id, user_id, name, email)
    SELECT gen_random_uuid(), admin_user_id, 'Admin User', 'admin@farmconnect.com'
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Enable all access for admin users') THEN DROP POLICY "Enable all access for admin users" ON admin_users; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Allow authenticated users to read own admin status') THEN DROP POLICY "Allow authenticated users to read own admin status" ON admin_users; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Admins can view admin users') THEN DROP POLICY "Admins can view admin users" ON admin_users; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Admins can update own profile') THEN DROP POLICY "Admins can update own profile" ON admin_users; END IF;
END; $$;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read own admin status" ON admin_users FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view admin users" ON admin_users FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update own profile" ON admin_users FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE 'Admin user setup complete. Check auth.users and admin_users for admin@farmconnect.com'; END; $$;

-- Add Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'FarmConnect',
  support_email TEXT NOT NULL DEFAULT 'support@farmconnect.com',
  max_file_size INT NOT NULL DEFAULT 10,
  allow_registration BOOLEAN NOT NULL DEFAULT true,
  require_email_verification BOOLEAN NOT NULL DEFAULT false,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  contact_phone TEXT NOT NULL DEFAULT '+91 123 456 7890',
  contact_address TEXT NOT NULL DEFAULT '123 Agriculture Road, Farming District, New Delhi, 110001',
  social_links JSONB NOT NULL DEFAULT '{"facebook": "https://facebook.com/farmconnect", "twitter": "https://twitter.com/farmconnect", "instagram": "https://instagram.com/farmconnect", "linkedin": "https://linkedin.com/company/farmconnect"}',
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 2.5,
  min_withdrawal DECIMAL(10,2) NOT NULL DEFAULT 1000,
  max_withdrawal DECIMAL(10,2) NOT NULL DEFAULT 100000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read access to site settings" ON site_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Allow admin write access to site settings" ON site_settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_site_settings_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_timestamp BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_site_settings_timestamp();

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Add Notifications System
-- Create the parent notifications table with partitioning by range on created_at
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid(), -- No PRIMARY KEY here yet
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'order', 'message', 'payment', 'alert')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb,
  contract_id BIGINT REFERENCES smart_contracts(contract_id) ON DELETE SET NULL,
  aggregate_count INT DEFAULT 1 CHECK (aggregate_count >= 1)
) PARTITION BY RANGE (created_at);

-- Create an initial partition for 2025
CREATE TABLE notifications_2025 PARTITION OF notifications
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Add a unique index instead of a primary key
CREATE UNIQUE INDEX notifications_pk ON notifications (id, created_at);

-- Enable Row-Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add other indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_contract_id ON notifications(contract_id);

-- Recreate policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update all notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create own notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Recreate mark_notification_read function
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = p_notification_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

-- Notification count tracking
CREATE TABLE IF NOT EXISTS notification_counts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_count INT DEFAULT 0 CHECK (unread_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_notification_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.read = false THEN
    INSERT INTO notification_counts (user_id, unread_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE SET unread_count = notification_counts.unread_count + 1;
  ELSIF TG_OP = 'UPDATE' AND OLD.read = false AND NEW.read = true THEN
    UPDATE notification_counts
    SET unread_count = GREATEST(unread_count - 1, 0),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_count_trigger
AFTER INSERT OR UPDATE OF read ON notifications
FOR EACH ROW EXECUTE FUNCTION update_notification_count();


CREATE OR REPLACE FUNCTION notify_users(p_users UUID[], p_title TEXT, p_message TEXT, p_type TEXT, p_data JSONB, p_contract_id BIGINT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data, contract_id, created_at)
  SELECT unnest(p_users), p_title, p_message, p_type, p_data, p_contract_id, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION notify_users TO authenticated;

-- Add Products Management System
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id),
  buyer_id uuid REFERENCES buyers(id),
  type text NOT NULL CHECK (type IN ('sell', 'buy')),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL,
  category text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'active',
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_unit CHECK (unit IN ('kg', 'quintal', 'ton', 'piece', 'dozen')),
  CONSTRAINT valid_category CHECK (category IN ('grains', 'vegetables', 'fruits', 'pulses', 'herbs', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'draft', 'sold_out', 'archived')),
  CONSTRAINT check_seller_buyer CHECK ((type = 'sell' AND farmer_id IS NOT NULL AND buyer_id IS NULL) OR (type = 'buy' AND buyer_id IS NOT NULL AND farmer_id IS NULL))
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own products" ON products FOR SELECT TO authenticated USING (farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()));
CREATE POLICY "Farmers can create own products" ON products FOR INSERT TO authenticated WITH CHECK (type = 'sell' AND farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) AND buyer_id IS NULL);
CREATE POLICY "Farmers can update own products" ON products FOR UPDATE TO authenticated USING (farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()));
CREATE POLICY "Farmers can delete own products" ON products FOR DELETE TO authenticated USING (farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()));

CREATE POLICY "Buyers can view own products" ON products FOR SELECT TO authenticated USING (buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()));
CREATE POLICY "Buyers can create own products" ON products FOR INSERT TO authenticated WITH CHECK (type = 'buy' AND buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()) AND farmer_id IS NULL);
CREATE POLICY "Buyers can update own products" ON products FOR UPDATE TO authenticated USING (buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()));
CREATE POLICY "Buyers can delete own products" ON products FOR DELETE TO authenticated USING (buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view all products" ON products FOR SELECT TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Users can update own product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);


CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES farmers(id) NOT NULL,
  buyer_id uuid REFERENCES buyers(id) NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_chat_participants UNIQUE (farmer_id, buyer_id, product_id),
  CONSTRAINT check_participants CHECK (
    farmer_id != buyer_id
  )
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;


CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION update_chats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chats_timestamp
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_chats_timestamp();

  -- Farmers and buyers can view chats they are part of
CREATE POLICY "Participants can view chats" ON chats
  FOR SELECT
  TO authenticated
  USING (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );

-- Farmers and buyers can create chats they are part of
CREATE POLICY "Participants can create chats" ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );

-- Farmers and buyers can update their chats
CREATE POLICY "Participants can update chats" ON chats
  FOR UPDATE
  TO authenticated
  USING (
    farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
    buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
  );


  -- Participants can view messages in their chats
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (
        chats.farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
        chats.buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
      )
    )
  );

-- Participants can send messages in their chats
CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (
        chats.farmer_id IN (SELECT id FROM farmers WHERE user_id = auth.uid()) OR
        chats.buyer_id IN (SELECT id FROM buyers WHERE user_id = auth.uid())
      )
      AND messages.sender_id = auth.uid()
    )
  );

-- Users can update their own messages (e.g., mark as read)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Policy for admins to update any product (including featured status)
CREATE POLICY "Admins can update all products" ON products 
FOR UPDATE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Update existing policy to allow public to see active and featured products
DROP POLICY IF EXISTS "Anyone can view all products" ON products;
CREATE POLICY "Anyone can view active products" ON products 
FOR SELECT 
TO authenticated 
USING (status = 'active');

-- Drop existing policies that might conflict (optional, if you want to replace them)
DROP POLICY IF EXISTS "Admins can view all farmers" ON farmers;
DROP POLICY IF EXISTS "Admins can insert farmers" ON farmers;
DROP POLICY IF EXISTS "Admins can update all farmers" ON farmers;
DROP POLICY IF EXISTS "Admins can delete all farmers" ON farmers;

-- Allow admins to view all farmers
CREATE POLICY "Admins can view all farmers" ON farmers
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Allow admins to insert farmers
CREATE POLICY "Admins can insert farmers" ON farmers
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Allow admins to update all farmers
CREATE POLICY "Admins can update all farmers" ON farmers
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Allow admins to delete all farmers
CREATE POLICY "Admins can delete all farmers" ON farmers
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));


ALTER TABLE farmers
DROP CONSTRAINT farmers_user_id_fkey,
ADD CONSTRAINT farmers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

  ALTER TABLE chats
DROP CONSTRAINT chats_farmer_id_fkey,
ADD CONSTRAINT chats_farmer_id_fkey
FOREIGN KEY (farmer_id)
REFERENCES farmers (id)
ON DELETE CASCADE;

ALTER TABLE products
DROP CONSTRAINT products_farmer_id_fkey,
ADD CONSTRAINT products_farmer_id_fkey
FOREIGN KEY (farmer_id)
REFERENCES farmers (id)
ON DELETE CASCADE;

ALTER TABLE messages
DROP CONSTRAINT messages_chat_id_fkey,
ADD CONSTRAINT messages_chat_id_fkey
FOREIGN KEY (chat_id)
REFERENCES chats (id)
ON DELETE CASCADE;

-- Update foreign key constraint for buyers.user_id to cascade deletes from auth.users
ALTER TABLE buyers
DROP CONSTRAINT buyers_user_id_fkey,
ADD CONSTRAINT buyers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE products
DROP CONSTRAINT products_farmer_id_fkey,
ADD CONSTRAINT products_farmer_id_fkey
  FOREIGN KEY (farmer_id)
  REFERENCES farmers (id)
  ON DELETE CASCADE;
  
-- If chats exist for buyers, update foreign key constraint for chats.buyer_id
ALTER TABLE chats
DROP CONSTRAINT chats_buyer_id_fkey,
ADD CONSTRAINT chats_buyer_id_fkey
  FOREIGN KEY (buyer_id)
  REFERENCES buyers(id)
  ON DELETE CASCADE;

-- If messages exist and are tied to chats, ensure cascading deletes from chats
ALTER TABLE messages
DROP CONSTRAINT messages_chat_id_fkey,
ADD CONSTRAINT messages_chat_id_fkey
  FOREIGN KEY (chat_id)
  REFERENCES chats(id)
  ON DELETE CASCADE;

  ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

  INSERT INTO storage.buckets (id, name, public) 
VALUES ('admin-profile-photos', 'admin-profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for admin profile photos
CREATE POLICY "Admins can upload own profile photos" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'admin-profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view own profile photos" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'admin-profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can update own profile photos" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'admin-profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete own profile photos" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'admin-profile-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- Policy for public read access create bucket slider-images
CREATE POLICY "Public can read slider images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'slider-images');

-- Policy for admin write access
CREATE POLICY "Admins can write slider images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'slider-images' 
  AND auth.role() = 'authenticated'
  AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);


CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_primary_text TEXT NOT NULL,
  cta_primary_link TEXT NOT NULL,
  cta_secondary_text TEXT NOT NULL,
  cta_secondary_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS platform_stats (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_listings INT NOT NULL DEFAULT 0,
  registered_farmers INT NOT NULL DEFAULT 0,
  daily_transactions DECIMAL(15, 2) NOT NULL DEFAULT 0.0,
  verified_buyers INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to platform stats" 
ON platform_stats 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow admin write access to platform stats" 
ON platform_stats 
FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())) 
WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION update_platform_stats_timestamp() 
RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; $$ 
LANGUAGE plpgsql;

CREATE TRIGGER update_platform_stats_timestamp 
BEFORE UPDATE ON platform_stats 
FOR EACH ROW 
EXECUTE FUNCTION update_platform_stats_timestamp();

INSERT INTO platform_stats (id, active_listings, registered_farmers, daily_transactions, verified_buyers) 
VALUES (1, 2500, 1200, 500000, 500) 
ON CONFLICT (id) DO NOTHING;