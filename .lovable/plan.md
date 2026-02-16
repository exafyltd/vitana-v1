

## Fix: "Setting up video room..." - Daily.co URL Not Loading

### Root Cause

The gateway's `GET /api/v1/live/rooms/:id/state` endpoint does **not** include the `metadata` field in its response. It only returns: `id, status, room_name, room_slug, host_user_id, current_session_id`.

However, the code at line 138 tries to read the Daily.co URL from the gateway response:
```
const dailyRoomUrl = (roomState?.room?.metadata as ...)?.daily_room_url
```

This is always `undefined`, so the fallback "Setting up video room..." spinner shows forever.

The `daily_room_url` **does exist** in the database (`live_rooms.metadata`), it's just not being fetched.

### Fix

**File: `src/pages/community/LiveRoomViewer.tsx`**

1. **Expand the existing DB query** (line 53-65) to also select `metadata` alongside `host_user_id`:
   ```
   .select('host_user_id, metadata')
   ```

2. **Change the `dailyRoomUrl` derivation** (line 138) to read from the DB result (`dbRoom`) instead of the gateway response (`roomState`):
   ```
   const dailyRoomUrl = (dbRoom?.metadata as Record<string, unknown>)?.daily_room_url as string | null ?? null;
   ```

That's it -- two small changes. The DB query already runs on mount and is cached for 60 seconds, so there's no extra network cost.

### What Stays the Same
- Gateway polling via `useRoomState` (still used for status, counts, session data)
- `DailyVideoRoom` component (unchanged)
- Host presence signaling (unchanged)
- All chat, reactions, and participant UI
