-- Backfill: Link existing room to app_user and set room_name
UPDATE app_users 
SET live_room_id = 'cfb2fe31-3b01-4569-ae54-5fc2f1148735'
WHERE user_id = '0adc6ff6-acb0-4dca-99d0-295211a40e3e' AND live_room_id IS NULL;

-- Set room_name for rooms missing it
UPDATE live_rooms 
SET room_name = COALESCE(
  (SELECT display_name || '''s Room' FROM app_users WHERE user_id = live_rooms.host_user_id LIMIT 1),
  'My Room'
),
room_slug = COALESCE(
  room_slug,
  LOWER(REPLACE(COALESCE(
    (SELECT display_name FROM app_users WHERE user_id = live_rooms.host_user_id LIMIT 1),
    'user'
  ), ' ', '-')) || '-' || SUBSTRING(id::text, 1, 6)
),
status = CASE WHEN status = 'scheduled' AND current_session_id IS NULL THEN 'idle' ELSE status END
WHERE room_name IS NULL OR room_slug IS NULL;