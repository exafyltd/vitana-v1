ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ai_data_consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_data_consent_date timestamptz;