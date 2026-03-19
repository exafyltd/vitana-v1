

## Fix: Unify Unread Count Across All Badge Locations

### Problem
`useChatUnreadCount()` is called independently by `MobileBottomNav`, `SideDrawerNav`, and the inbox. Each call creates its own React state, its own Supabase realtime channels, and its own polling timer. When a realtime event fires, only one instance updates immediately; the others lag behind until their own channel fires or their 60s poll triggers. This causes the visible badge misalignment shown in the screenshots (e.g., drawer shows "2" while bottom nav shows "1").

### Root Cause
Multiple hook instances = multiple independent states. There is no shared store.

### Solution
Convert `useChatUnreadCount` from a per-instance hook into a **singleton shared store** using a module-level reactive pattern. All consumers will read from and write to the same value.

### Changes

**File: `src/hooks/useChatUnreadCount.ts`** (rewrite)

1. Move `unreadCount`, `refresh`, channels, and polling into **module-level singletons** (a single `let count`, a single Supabase channel subscription, a single poll timer).
2. Use a `Set<callback>` of listeners so each hook instance subscribes to the shared value via `useSyncExternalStore` (or a lightweight `useState` + `useEffect` subscriber pattern).
3. Keep only **one** Supabase realtime channel (`chat_unread_badge`) and **one** broadcast channel (`chat_sidebar_unread_sync`) globally, initialized on first subscriber and torn down when the last unsubscribes.
4. The `chat-unread-refresh` window event and `fetchUnreadCount` gateway call remain unchanged -- they just update the shared value which notifies all subscribers instantly.

**No changes needed** to `MobileBottomNav.tsx`, `SideDrawerNav.tsx`, or any consumer -- the hook signature (`{ unreadCount, refresh, decrementBy }`) stays identical.

### Technical Approach

```text
Module-level singleton:
  let currentCount = 0
  let listeners = Set<() => void>()
  let initialized = false

  function init(userId):
    if initialized, return
    set up ONE realtime channel
    set up ONE poll timer
    set up ONE 'chat-unread-refresh' listener
    initialized = true

  function notify():
    listeners.forEach(cb => cb())

  export function useChatUnreadCount():
    init(user.id)
    const [, rerender] = useState(0)
    useEffect: listeners.add(rerender); return () => listeners.delete(rerender)
    return { unreadCount: currentCount, refresh, decrementBy }
```

This guarantees all three badge locations (thread card, bottom nav, drawer) update simultaneously from a single source of truth with zero additional network calls.

