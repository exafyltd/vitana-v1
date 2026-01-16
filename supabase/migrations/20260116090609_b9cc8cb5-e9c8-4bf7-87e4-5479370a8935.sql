-- Change default language from English to German for new users
ALTER TABLE user_preferences 
ALTER COLUMN stt_language SET DEFAULT 'de-DE';

-- Also update the default TTS voice to German
ALTER TABLE user_preferences 
ALTER COLUMN tts_voice SET DEFAULT 'de-DE-Chirp3-HD-Achernar';