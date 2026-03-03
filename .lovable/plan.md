
Goal: Stop profile counters from flashing wrong values (0 → late numbers), make them load instantly from cache when possible, and keep behavior consistent on web + mobile.

What went wrong (and why each fix felt worse)
1) Wrong ID source at first render
- `/me/profile` often starts with `profile.id = "current-user"` before real auth/profile sync finishes.
- Multiple hooks then query with wrong/placeholder ID, returning zero-like states.
- Later, when real ID arrives, counters “jump” (your 5–10s effect).

2) Server state managed as local state (useFollow)
- `useFollow` uses `useState/useEffect` instead of React Query.
- On every remount, counts reset to `0` first, then fetch.
- No cache-first render for followers/following.

3) Duplicate follow queries from multiple components
- `ProfileLayout`, `ProfileStats`, `MobileProfileStats`, and `ProfileIdCardFront` each call `useFollow`.
- This creates redundant RPC calls + racing state updates + inconsistent timing.

4) Loading flag mismatch (`isLoading` only)
- In TanStack v5, disabled queries can have `isLoading=false` while data is still unresolved.
- UI then renders `0` instead of skeleton/cached value.

5) Silent error-to-zero behavior
- `useProfileStatsCount` doesn’t fail loudly on bad inputs/errors; it falls back to 0.
- This hides real problems and shows incorrect interim numbers.

Industry-standard fix (single pass, no wheel reinvention)
Use stable IDs + React Query cache-first semantics + single source of truth per data domain.

Implementation plan
A) Fix identity resolution first (root cause)
- Add a small resolver utility (e.g. `resolveProfileUserId`) that:
  - Prefers real UUID `profile.user_id`
  - Accepts `profile.id` only if valid UUID (reject `"current-user"`)
  - Falls back to authenticated `user.id`
- Apply in:
  - `ProfileLayout.tsx`
  - `ProfileSplitNavigation.tsx`
  - `ProfileStats.tsx`
  - `MobileProfileStats.tsx`
  - `ProfileIdCardFront.tsx` (for follow/message target safety)
- Update `EditProfilePage.tsx` so once auth user is known, `profile.id` is synchronized to `user.id` immediately (not left as placeholder).

B) Refactor `useFollow` to React Query (cache-first)
- Replace initial local fetch logic with:
  - Query 1: follow status (`['follow-status', viewerId, targetUserId]`)
  - Query 2: follow counts (`['follow-counts', targetUserId]`)
- Keep mutations (`followUser/unfollowUser`) but update cache optimistically via `queryClient.setQueryData`.
- Keep realtime subscriptions only for invalidation/update, not as primary state source.
- Return explicit flags:
  - `isInitialLoading` (no cached data yet)
  - `isFetching` (background refresh)
- Result: followers/following render instantly from cache on return navigation.

C) Remove duplicate hook ownership
- `ProfileLayout` remains the single owner of follow counts for profile header/stats.
- `ProfileStats` and `MobileProfileStats` stop calling `useFollow` when counts are passed as props.
- For places needing only follow button behavior, use status/action from one resolved hook instance.

D) Harden `useProfileStatsCount`
- Use resolved UUID only.
- If ID unresolved, expose pending state (do not render 0).
- Differentiate “loading without data” vs “background refetch with cached data”.
- Keep current count queries (fast with indexes) but add strict error handling/logging so bad IDs never masquerade as zeros.

E) Make cache persistence consistent for profile counters
- Extend `PERSIST_KEYS` in `main.tsx` to include:
  - `profile-stats-count`
  - `follow-counts` / `follow-status`
- So returning to profile (or refresh) uses warm cache first, then silent refresh.

Files to update
- `src/pages/EditProfilePage.tsx`
- `src/hooks/useFollow.ts`
- `src/hooks/useProfileStatsCount.ts`
- `src/components/profile/shared/ProfileLayout.tsx`
- `src/components/profile/shared/ProfileSplitNavigation.tsx`
- `src/components/profile/shared/ProfileStats.tsx`
- `src/components/profile/mobile/MobileProfileStats.tsx`
- `src/components/profile/shared/ProfileIdCardFront.tsx`
- `src/main.tsx`
- `src/lib/*` (new small profile ID resolver utility)

Technical details (concise)
- TanStack v5 best practice: rely on cache + `isPending`/“has data” checks for first-load gating; avoid showing numeric defaults as placeholders.
- Server data should be in React Query, not component `useState`.
- One query owner per domain (follow counts), children consume props.
- Never allow placeholder non-UUID IDs to hit DB queries.

Validation checklist (must pass on both desktop + mobile)
1) Open `/me/profile` with cold cache:
- No “0 flash”; show skeleton only where truly unresolved.
2) Navigate away and back:
- Counters render immediately from cache; background refresh does not blank UI.
3) Followers/Following/Groups click:
- Dialogs open correctly, counts consistent.
4) Compare mobile vs desktop:
- Same values, same timing behavior.
5) Realtime disconnected scenario:
- Counts still appear immediately (from cache), then refresh gracefully.
