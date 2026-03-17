
-- Clean up stale device tokens: keep only the most recent token per user
DELETE FROM user_device_tokens a
USING user_device_tokens b
WHERE a.user_id = b.user_id
  AND a.updated_at < b.updated_at
  AND a.id != b.id;
