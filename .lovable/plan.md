

## Plan: Appilix Push Notification Integration

### What this does
When a chat message (DM or group) creates a row in `user_notifications`, a database trigger will call the Appilix Push API to deliver a native Android notification to the recipient's device. This uses the `user_identity` mapping already set in `App.tsx` (`user.id`).

### Steps

**1. Store Appilix secrets**
Add two new Edge Function secrets:
- `APPILIX_APP_KEY` = `8kwa81zf6ye64b0j42unyk7j9wgbr3u35pfidvn9`
- `APPILIX_API_KEY` = `u9p6gt2iqnbrod7kmshy`

**2. Create `appilix-push` Edge Function**
New file: `supabase/functions/appilix-push/index.ts`

Accepts POST with `{ user_identity, notification_title, notification_body, open_link_url }`. Calls `https://appilix.com/api/push-notification` with the secrets + payload using `application/x-www-form-urlencoded` (matching the cURL example). Returns success/failure.

Add to `supabase/config.toml`:
```toml
[functions.appilix-push]
verify_jwt = false
```

**3. Add database trigger on `user_notifications`**
SQL migration:

```sql
CREATE OR REPLACE FUNCTION notify_appilix_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire for push-eligible notifications
  IF NEW.channel IN ('push_and_inapp', 'push') AND NEW.priority IN ('p1', 'p2') THEN
    PERFORM net.http_post(
      url := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/appilix-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <anon_key>'
      ),
      body := jsonb_build_object(
        'user_identity', NEW.user_id::text,
        'notification_title', NEW.title,
        'notification_body', NEW.body,
        'open_link_url', 'https://vitana-v1.lovable.app' || COALESCE(NEW.data->>'url', '/inbox')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appilix_push
AFTER INSERT ON user_notifications
FOR EACH ROW EXECUTE FUNCTION notify_appilix_push();
```

### Flow
```text
Chat message → trg_notify_chat_message → user_notifications INSERT
  → trg_appilix_push → pg_net POST to appilix-push edge function
    → Edge function POST to https://appilix.com/api/push-notification
      → Appilix routes via user_identity (= Supabase user ID)
        → Native bell notification on Android device
```

### No changes needed
- No React/frontend code changes
- Existing web push path for desktop browsers remains untouched
- Identity mapping in `App.tsx` already works correctly

