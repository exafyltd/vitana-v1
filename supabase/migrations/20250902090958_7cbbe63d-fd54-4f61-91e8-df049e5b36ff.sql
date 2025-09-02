-- Create the missing tenant_role enum type
CREATE TYPE public.tenant_role AS ENUM ('community', 'patient', 'professional', 'staff', 'admin');

-- Create collection_method enum for lab_test_orders if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.collection_method AS ENUM ('home_collection', 'lab_visit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create order_status enum for lab_test_orders if it doesn't exist  
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'collected', 'processing', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create test_category enum for lab_tests if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.test_category AS ENUM ('blood', 'urine', 'saliva', 'comprehensive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create notification_type enum for notifications if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('system', 'reminder', 'result', 'appointment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;