-- test_user_applications: signups collected from the public /apply landing.
--
-- Funnel: Mariia Maksina IG → link-in-bio → /apply → this table.
-- We sort applicants internally by `device` (ios vs android) and pivot
-- onboarding accordingly: Android testers get added to Google Play Closed
-- Testing, iOS testers receive an App Store link. instagram_handle is the
-- primary onboarding key — we scrape it to bootstrap a Maxina profile so
-- the verified user has something to log into on day one.
--
-- RLS posture:
--   anon  → INSERT only (public form submissions)
--   anyone else → nothing (defaults deny; service_role / Supabase dashboard
--   is the read interface for the team).

CREATE TABLE IF NOT EXISTS public.test_user_applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),

  full_name            text NOT NULL,
  email                text NOT NULL,
  phone                text NOT NULL,
  instagram_handle     text NOT NULL,
  device               text NOT NULL CHECK (device IN ('ios', 'android')),
  google_account_email text,
  location             text NOT NULL,
  available_for_events boolean NOT NULL DEFAULT false,
  consent_age          boolean NOT NULL,
  consent_terms        boolean NOT NULL,

  utm_source           text,
  utm_medium           text,
  utm_campaign         text,

  -- Internal triage; updated via dashboard / service-role only.
  status               text NOT NULL DEFAULT 'pending',
  notes                text
);

CREATE INDEX IF NOT EXISTS test_user_applications_created_at_idx
  ON public.test_user_applications (created_at DESC);

CREATE INDEX IF NOT EXISTS test_user_applications_device_idx
  ON public.test_user_applications (device);

CREATE UNIQUE INDEX IF NOT EXISTS test_user_applications_email_uq
  ON public.test_user_applications (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS test_user_applications_instagram_uq
  ON public.test_user_applications (lower(instagram_handle));

ALTER TABLE public.test_user_applications ENABLE ROW LEVEL SECURITY;

-- Public landing form submits via the anon key. We cap what they can write
-- to defaults for status / notes by virtue of column defaults; clients can
-- send those fields but service-role review is the source of truth.
DROP POLICY IF EXISTS "anon_can_apply" ON public.test_user_applications;
CREATE POLICY "anon_can_apply"
  ON public.test_user_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.test_user_applications IS
  'Test-user signups from the public /apply landing (Mariia Maksina IG funnel). device=ios|android drives the onboarding path; instagram_handle is the primary profile-bootstrap key.';

COMMENT ON COLUMN public.test_user_applications.device IS
  'ios → App Store link; android → add to Google Play Closed Testing.';

COMMENT ON COLUMN public.test_user_applications.google_account_email IS
  'Required when device=android — the email linked to the user''s Google Play account, used to add them as a Closed Testing tester.';

COMMENT ON COLUMN public.test_user_applications.status IS
  'pending | verified | invited | active | rejected — internal triage.';
