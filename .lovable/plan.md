

## Revised Diagnosis: Chat Push Notifications

### Corrected Findings

My initial diagnosis about `chat_messages` missing triggers was **partially wrong**. Here is what the data actually shows:

**DM notification creation**: The **gateway** (not a DB trigger) creates `user_notifications` rows for DMs in `chat_messages`. Every human-to-human DM from March 16 has a matching `user_notifications` row created ~0.3s after the message, with `thread_id: null` and `title: 'New message'`.

**DM push delivery**: All 22 notifications from March 16 have `push_sent_at` populated. 100% delivery rate from March 10 onwards.

**Early failures**: 38 of 264 total notifications were undelivered — concentrated on March 5-6 (0/4 and 3/12 delivered). This was during initial setup, not a regression.

**Today (March 17)**: Zero human-to-human messages sent. Zero notifications expected. The system has not been tested today.

### So Why Did Notifications Stop?

The evidence does NOT show a clear regression in the DB-to-push pipeline. The most likely causes for "stopped arriving" are:

1. **Stale FCM tokens accumulating** — User `c7d3260d` has **13 device token rows**, all with different tokens. The gateway sends to all of them, but only the latest is valid. Expired tokens cause FCM `NotRegistered` errors, potentially slowing or failing the batch.

2. **Gateway is the single point of failure for DM notifications** — Unlike `global_messages` and `messages` (which have DB triggers), `chat_messages` relies entirely on the gateway to create the `user_notifications` row. If the gateway is down when a DM is sent, no notification is created at all.

3. **No retry mechanism** — If FCM fails for the valid token (network blip, token just rotated), nothing retries.

---

## Implementation Plan

### Priority 1 — Add `chat_messages` notification trigger (Confirmed Bug Fix)

**What**: Create a DB trigger on `chat_messages` that inserts into `user_notifications` for the receiver, mirroring the pattern used by `notify_on_tenant_message` and `notify_on_global_message`.

**Why**: Currently, DM notification creation depends entirely on the gateway being alive and successfully processing the send. A DB trigger ensures the `user_notifications` row is created regardless of gateway health.

**SQL migration**:

```sql
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_body_preview TEXT;
  v_tenant_id UUID;
BEGIN
  -- Skip bot messages
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  -- Skip self-messages
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT COALESCE(full_name, handle, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  v_body_preview := LEFT(COALESCE(NEW.content, ''), 100);

  -- Look up receiver's primary tenant
  SELECT tenant_id INTO v_tenant_id
  FROM user_tenants
  WHERE user_id = NEW.receiver_id AND is_primary = true
  LIMIT 1;

  -- Fallback to message's tenant_id
  v_tenant_id := COALESCE(v_tenant_id, NEW.tenant_id);

  -- Deduplicate: skip if gateway already created a notification for this message
  -- (check by matching sender_id + receiver + timestamp window)
  IF EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = NEW.receiver_id
      AND type = 'new_chat_message'
      AND data->>'sender_id' = NEW.sender_id::text
      AND created_at > NEW.created_at - interval '5 seconds'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (
    NEW.receiver_id,
    v_tenant_id,
    'new_chat_message',
    'New Message',
    v_sender_name || ': ' || v_body_preview,
    jsonb_build_object(
      'entity_id', NEW.id::text,
      'sender_id', NEW.sender_id::text,
      'url', '/inbox'
    ),
    'push_and_inapp',
    'p1'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_chat_message();
```

**Deduplication**: Since the gateway may also create a `user_notifications` row for the same DM, the trigger checks for a recent notification from the same sender to the same receiver within a 5-second window. This prevents duplicate pushes.

**Security**: Uses `SECURITY DEFINER` with explicit `search_path = public` (same pattern as existing triggers). No secrets or credentials involved.

---

### Priority 1b — Clean up stale device tokens

**What**: Add a unique constraint or upsert logic so each user+device combination keeps only the latest token, preventing token accumulation.

**SQL migration**:

```sql
-- Remove duplicate/stale tokens, keeping only the most recent per user
DELETE FROM user_device_tokens a
USING user_device_tokens b
WHERE a.user_id = b.user_id
  AND a.updated_at < b.updated_at
  AND a.id != b.id;
```

This is a data cleanup. Going forward, the gateway's `/notifications/token` endpoint should upsert by `user_id + device_label` rather than always inserting. That is a **gateway-side change** (not implementable from this project).

---

### Priority 2 — Gateway Reliability Assessment

**Evidence collected**:

| Metric | Value |
|---|---|
| March 10-16 delivery rate | 100% (209/209) |
| March 5-6 delivery rate | 18% (3/16) |
| March 9 delivery rate | 67% (2/3) |
| Token accumulation | User c7d3260d has 13 tokens |
| Retry mechanism | None observed |
| Polling fallback | None observed (gateway uses Supabase realtime subscription) |

**Assessment**: The gateway has been reliable since March 10. The early failures (March 5-6) were during initial setup. The current report of "stopped arriving" likely relates to either (a) stale tokens causing FCM delivery failures at the device level, or (b) the gateway being temporarily unavailable during a specific DM send.

**Recommendation**: Before adding complex webhook infrastructure, verify with the user whether notifications fail consistently or intermittently. The DB trigger (Priority 1) will ensure notification rows are always created. Token cleanup (Priority 1b) will ensure FCM targets the correct device.

---

### Priority 3 — Delivery Hardening Options (Comparison)

| Option | Pros | Cons | Security Risk |
|---|---|---|---|
| **Improve gateway reconnect** | No DB changes needed | Requires Cloud Run code changes; still a single point of failure | None |
| **DB webhook trigger (pg_net)** | Instant delivery; database-driven | Requires storing gateway auth secrets in a DB function; `pg_net` availability varies | Service role key in DB function |
| **Scheduled dispatcher** | Simple; retries missed notifications | Adds latency (poll interval); extra cron job | Minimal |
| **Realtime + periodic retry** | Best coverage; handles both real-time and missed cases | Most complex to implement | Minimal |

**Recommendation**: Option 3 (scheduled dispatcher) is the safest. Create a cron-triggered edge function that queries `user_notifications WHERE push_sent_at IS NULL AND created_at > now() - interval '1 hour'` and dispatches them via the gateway API. This:
- Requires no secrets in DB functions
- Catches any missed notifications regardless of cause
- Does not duplicate the realtime path
- Can be deployed as a Supabase edge function with a cron trigger

This is an **infrastructure hardening** change, not a bug fix. It should be implemented after Priority 1 is confirmed working.

---

### DM Flow Confirmation

**Question**: Does the Inbox DM path write to `chat_messages`, `messages`, or both?

**Answer**: Both, depending on the code path:
- **Primary path** (gateway available): The gateway API handles the send. The gateway writes to `chat_messages` and also creates the `user_notifications` row.
- **Fallback path** (gateway down): The frontend falls back to inserting directly into `chat_messages` via Supabase client (line 780-791 in `useGlobalMessages.ts`). In this path, no `user_notifications` row is created — which is exactly what the new trigger fixes.
- The `messages` table is used for **tenant-scoped** threads (has its own triggers). DMs between users go through `chat_messages`.

---

### Summary

| Item | Type | Action |
|---|---|---|
| `chat_messages` trigger | Bug fix | DB migration — create `notify_on_chat_message` with dedup |
| Stale token cleanup | Bug fix | DB data cleanup + gateway-side upsert recommendation |
| Scheduled retry dispatcher | Infrastructure hardening | Edge function with cron (future, after Priority 1 verified) |
| Gateway reconnect improvements | Infrastructure hardening | Cloud Run code change (external) |

### Files Modified
- Database migration only (no frontend code changes needed for Priority 1)

