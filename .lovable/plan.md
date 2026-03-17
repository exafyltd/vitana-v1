## Chat Push Notifications — Fix Applied

### Changes

| # | Type | Change |
|---|------|--------|
| 1 | DB Migration | Created `notify_on_chat_message()` trigger on `chat_messages` table |
| 2 | DB Migration | Cleaned up stale device tokens (kept only most recent per user) |

### Priority 1 — `chat_messages` Notification Trigger

- **Function**: `public.notify_on_chat_message()` (SECURITY DEFINER, search_path = public)
- **Trigger**: `trg_notify_chat_message` AFTER INSERT on `chat_messages`
- **Behavior**: Inserts into `user_notifications` for the receiver with type `new_chat_message`, channel `push_and_inapp`
- **Deduplication**: 5-second window check prevents duplicates when gateway also creates a notification
- **Skips**: Bot messages (`00000000-...0001`) and self-messages

### Priority 1b — Stale Token Cleanup

- Removed duplicate `user_device_tokens` rows, keeping only the most recent per user
- Gateway-side upsert recommended to prevent re-accumulation

### Priority 3 — Future Hardening (Not Yet Implemented)

Recommended: Scheduled retry dispatcher edge function for `user_notifications WHERE push_sent_at IS NULL`

### Deploy

No edge function deploys needed. Both changes are database-level (triggers + data cleanup).
