

## Fix: Relax Presence Staleness Guard

**Problem:** Jovana Tadic appears "away" (yellow) despite being actively online. The `normalizePresenceStatus` function downgrades users to `away` after 5 minutes and `offline` after 10 minutes, but this threshold is too aggressive given query cache delays and realtime propagation lag.

**Solution:** Three targeted changes to `src/hooks/useUserPresence.ts`:

### 1. Widen staleness thresholds (line 39-42)
Change from 5/10 minutes to 15/30 minutes:
- 15 minutes → `away` (was 5)
- 30 minutes → `offline` (was 10)

This gives plenty of margin above the 30-second heartbeat interval.

### 2. Use actual status column from DB (line 270)
Replace hardcoded `'online'` with the real `item.status` value from `thread_presence` table:
```typescript
const status = normalizePresenceStatus(item.status || 'online', item.last_seen);
```

### 3. Trust realtime channel presence (line 302)
If a user is present in the Supabase realtime channel, treat them as definitively online by using the current timestamp:
```typescript
const normalizedStatus = normalizePresenceStatus(presence.status, new Date().toISOString());
```

This bypasses the staleness guard for users actively broadcasting presence via the channel.

### Files Modified
- `src/hooks/useUserPresence.ts` only

### Result
Active chatting users show solid green dot. Only truly idle users (15+ min no activity) show amber. Only absent users (30+ min) show gray.

