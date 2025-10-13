-- Fix search_path for the trigger function created in previous migration
CREATE OR REPLACE FUNCTION update_api_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public';