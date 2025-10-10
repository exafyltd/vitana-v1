-- Create contacts table for managing user contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_phone TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  is_on_platform BOOLEAN DEFAULT false,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Prevent duplicate contacts for same user
  CONSTRAINT unique_user_phone UNIQUE(user_id, contact_phone),
  CONSTRAINT unique_user_contact UNIQUE(user_id, contact_user_id),
  
  -- Ensure at least phone or user_id is present
  CONSTRAINT contact_identifier_required CHECK (
    contact_phone IS NOT NULL OR contact_user_id IS NOT NULL
  )
);

-- Create indexes for performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_contact_user_id ON public.contacts(contact_user_id) WHERE contact_user_id IS NOT NULL;
CREATE INDEX idx_contacts_phone ON public.contacts(contact_phone) WHERE contact_phone IS NOT NULL;
CREATE INDEX idx_contacts_platform_status ON public.contacts(user_id, is_on_platform);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own contacts
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: Check if phone number is registered on platform
CREATE OR REPLACE FUNCTION public.check_phone_on_platform(phone_number TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.phone = phone_number
    AND p.phone IS NOT NULL
  LIMIT 1;
END;
$$;

-- Helper function: Auto-match contacts when user verifies phone
CREATE OR REPLACE FUNCTION public.match_existing_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update contacts table where this phone was added by others
  UPDATE public.contacts
  SET 
    contact_user_id = NEW.user_id,
    is_on_platform = true,
    updated_at = now()
  WHERE contact_phone = NEW.phone
    AND contact_user_id IS NULL
    AND NEW.phone IS NOT NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger on profiles table: Auto-link contacts when phone is verified
CREATE TRIGGER on_phone_verified
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.phone IS DISTINCT FROM NEW.phone AND NEW.phone IS NOT NULL)
  EXECUTE FUNCTION public.match_existing_contacts();