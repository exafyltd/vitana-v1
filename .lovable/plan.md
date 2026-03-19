## Appilix Push Notification Integration — Deployed

### What this does
When a chat message creates a `user_notifications` row, a DB trigger calls the Appilix Push API via an edge function to deliver a native Android bell notification.

### Components

| # | Type | Component | Status |
|---|------|-----------|--------|
| 1 | Secret | `APPILIX_APP_KEY`, `APPILIX_API_KEY` | ✅ Stored |
| 2 | Edge Function | `supabase/functions/appilix-push/index.ts` | ✅ Deployed |
| 3 | DB Trigger | `trg_appilix_push` on `user_notifications` | ✅ Active |
| 4 | Config | `supabase/config.toml` — `verify_jwt = false` | ✅ Updated |

### Flow
```
Chat message INSERT → trg_notify_chat_message → user_notifications INSERT
  → trg_appilix_push → pg_net POST → appilix-push edge function
    → POST https://appilix.com/api/push-notification (x-www-form-urlencoded)
      → Appilix routes via user_identity (= Supabase user.id)
        → Native Android bell notification
```

### API Fields (from Appilix docs)
- `app_key` — required
- `api_key` — required
- `notification_title` — required
- `notification_body` — required
- `user_identity` — optional (targets specific user)
- `open_link_url` — optional (opens URL on tap)

### Notes
- Desktop web push (FCM) path remains unchanged
- Identity mapping set in `App.tsx` via `window.appilix_push_notification_user_identity = user.id`
- Trigger fires for `channel IN ('push_and_inapp', 'push')`
