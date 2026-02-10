
-- 1. Create the user_discount_codes table
CREATE TABLE public.user_discount_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 10,
  valid_for text NOT NULL DEFAULT 'events',
  tenant_slug text NOT NULL DEFAULT 'maxina',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  used_at timestamptz,
  used_on_purchase_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.user_discount_codes ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Users can read their own codes
CREATE POLICY "Users can read their own discount codes"
  ON public.user_discount_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. RLS: Service role can insert/update (via triggers and edge functions)
CREATE POLICY "Service role can manage discount codes"
  ON public.user_discount_codes
  FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Helper function to generate random alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_discount_code(prefix text DEFAULT 'MAXINA')
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := prefix || '-';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 6. Update handle_new_user() to generate discount code for Maxina users
-- We need to add discount code generation after the existing user creation logic
-- Use a separate trigger function to keep things clean
CREATE OR REPLACE FUNCTION public.generate_maxina_discount_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug text;
  v_code text;
  v_attempts integer := 0;
BEGIN
  -- Check if this user signed up via Maxina tenant
  v_tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  
  IF v_tenant_slug = 'maxina' THEN
    -- Generate unique code with retry
    LOOP
      v_code := generate_discount_code('MAXINA');
      BEGIN
        INSERT INTO public.user_discount_codes (user_id, code, discount_percent, valid_for, tenant_slug)
        VALUES (NEW.id, v_code, 10, 'events', 'maxina');
        EXIT; -- Success
      EXCEPTION WHEN unique_violation THEN
        v_attempts := v_attempts + 1;
        IF v_attempts > 5 THEN
          RAISE EXCEPTION 'Could not generate unique discount code after 5 attempts';
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create trigger on auth.users for discount code generation
-- This fires AFTER the handle_new_user trigger
CREATE TRIGGER on_auth_user_created_generate_discount
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_maxina_discount_code();

-- 8. Create trigger to send welcome discount email via pg_net
CREATE OR REPLACE FUNCTION public.notify_welcome_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the send-welcome-discount edge function via pg_net
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/send-welcome-discount',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object(
      'discount_code_id', NEW.id,
      'user_id', NEW.user_id,
      'code', NEW.code,
      'discount_percent', NEW.discount_percent,
      'expires_at', NEW.expires_at
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block user creation if email sending fails
  RAISE WARNING 'Failed to send welcome discount email: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_discount_code_created_send_email
  AFTER INSERT ON public.user_discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_welcome_discount();

-- 9. Index for quick lookups
CREATE INDEX idx_user_discount_codes_user_id ON public.user_discount_codes(user_id);
CREATE INDEX idx_user_discount_codes_code ON public.user_discount_codes(code);
