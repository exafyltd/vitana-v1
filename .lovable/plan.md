

## Fix Presence Indicator: Remove Blinking, Normalize States, Stabilize

### Problem
- The green "active" dot blinks continuously via `animate-pulse` — looks broken
- No consistent state normalization across components
- `StickyConversationHeader` uses a simple `isOnline` boolean instead of the shared presence system
- Stale presence data can keep users shown as "online" indefinitely
- Rapid realtime sync events cause visual flickering

### Changes

#### 1. `src/hooks/useUserPresence.ts` — Add debounced normalization + stale guard

- Add a `normalizeStatus` utility that maps any raw status to exactly three values: `'online' | 'away' | 'offline'`
- In the `sync` handler (line 235-262) and `loadDatabasePresence` (line 198-232): use `normalizeStatus` and add a **staleness check** — if `last_seen` is older than 10 minutes, force `offline` regardless of claimed status
- **Debounce** state updates: only call `setPresenceMap` if the normalized status for a user actually changed (compare against previous map before merging)
- Rename `getStatusColor` values to be explicit: `online → bg-green-500`, `away → bg-amber-500`, `offline → bg-gray-400` (away changes from yellow to amber for consistency)
- Update `getStatusText`: `online → 'Active'`, `away → 'Away'`, `offline → 'Offline'`

#### 2. `src/components/messages/PresenceIndicator.tsx` — Remove all animation

- **Delete** `enableAnimation` prop and its usage
- **Remove** `animate-pulse` from both the loading state (line 59) and the active dot (line 103)
- **Remove** the `boxShadow` glow effect (line 107-109)
- Replace loading state with a static gray dot (no pulse)
- Remove the 24-hour hide logic (line 80-82) — offline users should show gray dot, not vanish
- Simplify: just render the dot with `getStatusColor` — no conditional animations

#### 3. `src/components/messages/StickyConversationHeader.tsx` — Use PresenceIndicator

- Replace the manual `isOnline` boolean + hardcoded green div with `<PresenceIndicator>` component
- Change props: replace `isOnline?: boolean` with `participantUserId?: string` and `context?: 'global' | 'tenant'`
- Update the status text line (76) to use presence state text instead of `isOnline ? 'Online' : 'Offline'`

#### 4. `src/components/messages/mobile/MobileConversationCard.tsx` — No animation props

- Remove `enableAnimation` if it's being passed (currently not, but guard against future)
- Already uses `<PresenceIndicator>` correctly — will inherit the fixes

### Technical Details

**Normalization function** (added to `useUserPresence.ts`):
```text
function normalizeStatus(raw: string | null | undefined, lastSeen: string): PresenceStatus {
  const minutesSince = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (minutesSince > 10) return 'offline';
  if (minutesSince > 5) return 'away';
  
  switch (raw) {
    case 'online': case 'active': case 'available': return 'online';
    case 'idle': case 'away': return 'away';
    default: return 'offline';
  }
}
```

**Debounce guard** in sync handler: before merging into presenceMap, compare each user's normalized status against the existing entry — skip the `setPresenceMap` call entirely if nothing changed.

### Files Modified
- `src/hooks/useUserPresence.ts`
- `src/components/messages/PresenceIndicator.tsx`
- `src/components/messages/StickyConversationHeader.tsx`

### Acceptance
- No blinking/pulsing dots anywhere in inbox
- Active = solid green, Away = solid amber, Offline = solid gray
- Consistent across inbox rows, mobile cards, and conversation header
- No flicker on rerender, thread switch, or realtime sync
- Stale presence (>10 min no heartbeat) auto-downgrades to offline

