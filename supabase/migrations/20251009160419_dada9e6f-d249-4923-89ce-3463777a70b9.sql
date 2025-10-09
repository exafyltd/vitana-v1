-- Add missing Stripe identifier columns to provider_appointments
ALTER TABLE provider_appointments 
ADD COLUMN IF NOT EXISTS payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_session_id text;