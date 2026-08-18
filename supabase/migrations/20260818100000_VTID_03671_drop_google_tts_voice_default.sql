-- VTID-03671 — stop the database provisioning a Google TTS voice.
--
-- `user_preferences.tts_voice` carried a column DEFAULT of
-- 'de-DE-Chirp3-HD-Achernar' — a Google Cloud TTS (Chirp 3 HD) voice id. Every
-- new preferences row was therefore stamped with a Google voice, in German,
-- regardless of the language the user had actually chosen, and without any
-- code asking for it.
--
-- WHY THIS MATTERS BEYOND TIDINESS
-- -------------------------------
-- `tts_voice` is an OVERRIDE, not a requirement. `useTextToSpeech` already
-- derives a voice from `stt_language` whenever it is absent, and reads it with
-- optional chaining throughout, so NULL is a supported state:
--   de/en/es/fr/pt/ru/pl -> the Gemini voice map
--   sr                   -> the Google Speech map (Polly has NO Serbian voice
--                           in any engine, so Serbian stays on Google by
--                           standing decision)
--
-- Persisting a provider-specific id is precisely what turns a future provider
-- switch into a per-user data migration rather than a config change — the
-- problem CLAUDE.md 2c names outright: "a switch has to migrate stored per-user
-- preferences, not just change a provider. Every user who has opened voice
-- settings has a Google voice ID persisted against their profile." This stops
-- that pile growing while the platform moves voice to Polly and Nova on AWS.
--
-- WHAT THIS DOES NOT DO
-- ---------------------
-- Existing rows are deliberately left ALONE. Clearing them would be a bulk
-- write over real user preferences to fix a default, and any user who
-- deliberately picked a voice would silently lose it. New rows simply stop
-- being pinned, and the language picker now clears a stale override rather than
-- writing a replacement.
--
-- Audible behaviour today is unchanged: with NULL, the derived default resolves
-- to the same voice the default used to store.
--
-- ORDER OF OPERATIONS — APPLY THIS *AFTER* THE CODE IS LIVE, NOT BEFORE
-- ---------------------------------------------------------------------
-- Dropping the default makes new rows NULL. The frontend change that makes
-- NULL safe in the voice-settings Select (`value={preferences.tts_voice ??
-- undefined}`) ships in the same VTID. Applying this migration first would
-- hand a null `value` to a Radix Select in the build production is currently
-- serving, which renders a blank trigger instead of the placeholder.
--
-- Not dangerous, but it is a self-inflicted regression in the window between
-- the two, and the window is entirely avoidable by ordering them correctly.
--
-- REVERT: alter table public.user_preferences
--           alter column tts_voice set default 'de-DE-Chirp3-HD-Achernar';

alter table public.user_preferences
  alter column tts_voice drop default;

comment on column public.user_preferences.tts_voice is
  'Optional TTS voice OVERRIDE. NULL means "derive the voice from stt_language" '
  'and is the normal state — see VTID-03671. Do not reintroduce a '
  'provider-specific default here; it makes a provider switch a data migration.';
