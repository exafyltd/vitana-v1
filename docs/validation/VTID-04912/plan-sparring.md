# Plan: "Interested people" list on Live Room cards (vitana-v1)

Change class: **standard** (adds a DB migration/RPC).
Repo: exafyltd/vitana-v1 (branch claude/festive-albattani-f9zlyy, PR #1242 follows up on this).
Owner decisions (2026-10-06, in chat): the list is wanted; tapping the "X dabei / will join" count opens a list of the interested people; visible to **all signed-in members**.

<!-- plan:begin -->
## Context (verified by the planner)
- `live_stream_subscribers(stream_id, user_id, created_at)` stores who tapped "Notify me" (migration 20260530120000). RLS lets a user SELECT only their own rows; the migration comment says identities are deliberately never exposed; only `get_live_stream_subscriber_counts` (SECURITY DEFINER) returns aggregates.
- The Live Rooms card (`LiveRoomCard.tsx`) shows the count chip top-right for scheduled rooms ("willJoinCount"), as a plain non-interactive div. The Events list now renders the same card (PR #1242).
- Profiles are read with `useProfilesByIds` (`profiles.user_id, display_name, avatar_url`).
- Repo rules: test/bot accounts must not appear in any member-facing list (platform CLAUDE.md rules 43-45: `service_bot_accounts`, `notification_test_actors`); all user-visible strings via `src/i18n/de` then `en`; RTL-safe layout; read-only staging tests.

## Changes
1. **Migration** `supabase/migrations/<ts>_live_stream_interested_list.sql`: new `get_live_stream_subscribers(p_stream_id uuid, p_limit int default 100)` SECURITY DEFINER, `SET search_path = public`, STABLE, granted to `authenticated` only (not anon). Returns `user_id, display_name, avatar_url` joined from `profiles`, newest first, excluding any user in `notification_test_actors` (and `service_bot_accounts` if it exists in this database). Only returns rows for streams in status pending/live. The existing table policies stay unchanged (no direct SELECT widening).
2. **Hook** `useStreamSubscribers(streamId, enabled)` in `useStreamSubscription.ts`: calls the RPC lazily (only when the list is opened), fails soft to empty on a missing function.
3. **UI** new `InterestedPeopleSheet` (responsive dialog/drawer, existing `responsive-dialog`): header with count, scrollable list of avatar + name (ClickableAvatar to profile), empty state, loading state. Not shown to signed-out users.
4. **Card**: in `LiveRoomCard`, the "X dabei" chip becomes a button (stopPropagation so the card does not open) calling a new optional prop `onInterestedClick`; Live Rooms page and `EventLiveRoomCard` both wire it. Chip is still a plain div if the prop is absent.
5. **i18n**: new keys in `src/i18n/de/screens.json` (du-form) then `en`; run `npm run i18n:inventory`.
6. **Tests**: Vitest for the sheet and the chip (opens list, does not trigger card onClick, empty state); migration SQL reviewed against test-actor exclusion.
7. **Governance**: VTID + `docs/validation/<VTID>/plan-sparring.md` + `staging-tests.json` (read-only Playwright: open Events, tap the count chip on a scheduled room that already has subscribers, assert list renders). The same VTID also repairs the failing `change-suite` check on PR #1242.
8. Apply the migration through the repo's apply-migration workflow pattern (like `apply-live-subscribers-migration.yml`), staging-first per the deployment gate; no manual writes to production.

## Out of scope
Showing a list for live (in-room) viewers; push/notification changes; changing who may subscribe.
<!-- plan:end -->

## Planner responses — round 1
- F1 ACCEPTED. Migration header cites 20260530120000 and records the owner decision (2026-10-06, chat: list visible to all signed-in members) as a deliberate reversal of "never expose identity".
- F2 REJECTED as stated, partly ACCEPTED. `community_live_streams` has NO tenant_id column (20251022080341:2-12) and its SELECT policy is global: status in ('pending','live') or ended+replay (:36-41). There is no tenant boundary on streams to enforce, and every member can already read every stream. Accepted part: because SECURITY DEFINER bypasses RLS, the RPC re-applies the stream's own visibility predicate (status in pending/live only) and requires auth.uid() not null; it returns nothing for ended/cancelled streams.
- F3 ACCEPTED. New file `src/hooks/useStreamSubscribers.ts`, own query-key namespace.
- F4 ACCEPTED. Chip becomes a `<button type="button">` with `aria-label` from a new i18n key, visible focus ring, 44px tap area on mobile.
- F5 ACCEPTED. Add `docs/validation/<VTID>/sql-verification.sql` (assert test-actor exclusion, ended-stream empty, limit cap, anon denied) to be run only on an isolated Supabase branch, never production; Vitest covers the TS layer; staging spec is read-only.
- F6 ACCEPTED. Split: this feature gets its own VTID; the already-open PR #1242 card fix gets a separate VTID (and its own staging-tests.json) to clear change-suite. Plan step 7 amended accordingly.
- Q3 ACCEPTED. RPC caps `LEAST(COALESCE(p_limit,100), 200)`.
