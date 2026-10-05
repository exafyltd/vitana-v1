# Plan sparring record — VTID-04902 (shared with VTID-04901, VTID-04902, VTID-04903)

Plan hash (sha256 of the text between the plan markers): `2433e297fda2a347ab6c2cc4f29e56eb62ab1fd217e68533d2f702fd887c7b81`. Partner: plan-sparring-partner, 2 rounds, CONVERGED. Owner approved in session 2026-10-05 ("yes ship the group chat fix now. Fix everything i have listed").

Work items: G = VTID-04901, L = VTID-04902, E = VTID-04903.

# Plan: group chat exit, in-app event links from chat, member events visible in the Events catalog

Planner: Claude Code session (owner: d.stevanovic@exafy.io). Date: 2026-10-05.

<!-- plan:begin -->
## Owner report (2026-10-05, screenshot on Android, MAXINA app)
1. "I can't exit the screen with group: Alle Beisammen."
2. "When clicking the event link, it opens the event card inside the chat instead of redirect to the events screen."
3. "Mariia posted the new event, but in my event catalog nothing visible" — screenshot: Events & MeetUps, default tab "Hot", empty state "Keine empfohlenen Events".
Owner: "ship the group chat fix now", fix all three.

## Verified current state (code)
- G (group chat): `src/pages/messages/GroupChat.tsx` is a standalone full-screen route (`/inbox/g/:groupId`, App.tsx ~L1375) — no AppLayout, no bottom nav; the only exit is the header button. Header (L281) has no `env(safe-area-inset-top)`, while `index.html` sets `viewport-fit=cover` and the DM header (`ConversationView.tsx` ~L940) and `MobileAppShell.tsx` ~L63 pad for it. The screenshot shows the app drawing under the Android status bar, so the 32px "←" glyph button (`p-2`, text arrow) sits in/under the status bar. Loading state (L250) and `!group` (L273) render no back button at all. Container is `h-screen` (100vh), which on mobile webviews exceeds the visible height. `reload()` re-fetches the whole group incl. every member profile (`fetchGroup`) on mount, on every realtime INSERT and every 8s poll — for "Alle Beisammen" (every member) that is a large payload repeatedly, slowing load and keeping the user on the button-less loading screen. `goBack` = `navigate('/inbox', {replace:true})`, so the hardware back after leaving lands on /inbox again.
- L (chat links): `src/components/messages/MessageBubble.tsx` `renderLinkedText` (~L557-620) renders every URL as `<a target="_blank">`. Event share links are `https://vitanaland.com/events/<slug|id>` (`src/lib/shareUrl.ts` ~L58). Tapping opens a browser layer over the chat → OG worker → `/?share=event` → `ShareEntry` → public `PublicEventLanding` (`/e/<slug>`, `/pub/events/<id>`), i.e. the public event card "inside the chat". The in-app Events screen is `/comm/events-meetups?event=<id>` (EventsAndMeetups.tsx ~L544-563), which today matches only `e.id === param` and only within the loaded events.
- E (catalog): `EventsAndMeetups.tsx` ~L430-445 — the default "Hot" tab shows only `created_by === '07ade9bf…'` or one hardcoded event id (`HOT_EVENT_IDS`, "Dancing Filmevent"), unchanged since 2026-04-01. Every other member's event is invisible on the default tab. `fetchCommunityEventsQueryFn` (`useCommunityEvents.ts` ~L94-101) loads `start_time >= today` ordered by start, `limit(100)` — a newly created event further in the future than the 100 nearest is not loaded at all (not in Upcoming either). RLS (`is_community_user()` SELECT policy) does not filter by creator, no moderation/status column exists. Desktop Hot empty state is hardcoded English (~L1133-1134).

## Work items (vitana-v1 only, frontend; no schema change, no gateway change, no migration — Supabase reads only via existing client/RLS)
### G. Group chat can always be left (VTID A — ship first, own PR)
1. Header: `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` (same pattern as ConversationView), back button becomes a lucide `ArrowLeft` in a ≥44×44px target (`h-11 w-11`), `data-testid="group-chat-back"`, keeps `aria-label` (i18n key exists). RTL: icon flips with `rtl:rotate-180`.
2. Footer: `paddingBottom: env(safe-area-inset-bottom)`. Container `h-[100dvh]` instead of `h-screen`.
3. Loading and `!group` states render the same header (back button + translated loading text), so there is never a screen without an exit. Error state unchanged (already has a button).
4. `goBack`: if this screen was reached by in-app navigation (`useLocation().key !== 'default'` — React Router v6's documented marker for the initial entry) → `navigate(-1)`; else `navigate('/inbox', {replace:true})` (push-notification deep link / cold start). Removes the double-/inbox history entry.
5. Load cost: split `reload` into `loadGroup()` (group + members, on mount and on window focus/visibility) and `loadMessages()` (realtime INSERT + 8s fallback poll). Members are no longer re-fetched every 8s/every message. Sender names for members not in the cached map fall back exactly as today (`sender: null`).
6. "Today"/"Yesterday" date dividers (L104-105) are hardcoded English → use existing i18n keys if present, else add `inbox.group.today/yesterday` DE first then EN/ES/SR/AR.
7. Tests: vitest + RTL `GroupChat.test.tsx` — back button rendered in loading state, header has safe-area padding, back navigates to /inbox when no history, `fetchGroup` called once while messages poll runs (fake timers). Staging spec (read-only): open `/inbox`, open the "Alle Beisammen" group row, assert `group-chat-back` visible and in viewport, click → URL `/inbox`.

### L. Event links in chat open the in-app Events screen (VTID B)
1. New pure helper `src/lib/inAppLinks.ts` `resolveInAppEventPath(url)`: host ∈ {vitanaland.com, www.vitanaland.com, e.vitanaland.com, window.location.host}; path `/events/:x`, `/e/:x`, `/pub/events/:x`, `/comm/events-meetups?event=:x` → `/comm/events-meetups?event=<x>`; anything else → null.
2. `renderLinkedText`: for a non-null result, `onClick` → `preventDefault()`, `stopPropagation()`, `navigate(path)` (useNavigate — MessageBubble is always under the Router; verify both DM and group usages). Other links unchanged (`target=_blank`).
3. Add `slug?: string | null` to the `CommunityEvent` interface. Extract the enrichment in `fetchCommunityEventsQueryFn` (co-creator, creator profile, participant counts) into an exported `enrichCommunityEvents(rows, user)` used by the list query and by a new `fetchCommunityEventByIdOrSlug(p)` (read from `global_community_events` — a table with the `is_community_user()` SELECT policy — `.or(id.eq/slug.eq)`, uuid-checked so a slug never hits the uuid column, `maybeSingle`). `EventsAndMeetups` deep link matches `e.id === p || e.slug === p`; if not in the loaded set it fetches+enriches that one event and keeps it in a local `extraEvents` list merged into the tab lists (de-duplicated) so the drawer opens with full data. Tab detection unchanged.
4. Tests: vitest for `resolveInAppEventPath` (UUID, slug, encoded slug, www, e., foreign host, non-event path), MessageBubble click navigates instead of opening a new window; deep link by slug selects the event.

### E. Member events visible in the catalog (VTID C)
1. Extract Hot selection into pure `src/lib/events/hotEvents.ts` `selectHotEvents(events, now)`: drop ended events (as today); curated ones (MAXINA creator id + `HOT_EVENT_IDS`) first by start time; then member events created in the last 72h (newest first) so a just-posted event is near the top; then every other upcoming event by `participant_count` desc, then soonest start. The existing `event_type: 'event'` override for all Hot rows is dropped (meetups keep their own type). Hot is therefore never empty while any upcoming event exists, and a member's new event appears on the default tab.
2. Query (no schema change; a new read on the same `global_community_events` table under the same RLS): keep the nearest-100 query and add a second read in parallel: upcoming events created in the last 14 days (`created_at >= now-14d`, `start_time >= today`, `limit 50`), merged and de-duplicated by id before enrichment — a fresh event far in the future is always loaded. Realtime INSERT patching (existing) unchanged.
3. Desktop Hot empty state uses the same i18n keys as mobile (`screens.community.noRecommendedEvents`, `…checkBackSoonForCuratedEvents`).
4. Tests: vitest for `selectHotEvents` (curated first, member event included, ended dropped, ordering) and for the merged query (mock supabase: an event outside the first 100 but created recently is returned once).

## What's New
None of G/L/E qualify: all three are fixes restoring expected behaviour (exit a screen, open a link in-app, see existing events), not new features — skip per VTID-04733.

## Verification / release
Each VTID: vitest, `npm run lint` (i18n rules), `npm run build`, `npm run i18n:inventory` if strings change; `docs/validation/<VTID>/staging-tests.json` + `plan-sparring.md`. Merge → staging deploy → STAGING-VERIFY (read-only) → ready message → production only on the owner's "yes", pinned commit, with the commit range shown. No writes to production in any test.

## Out of scope (separate plan after the running investigation)
Live Room creation/catalog/counter/room rebuild — owner asked for it; it gets its own sparred plan.

## Change class
standard (3 work items, >3 files; no migrations/routes/auth/deploy files).

## Scope
vitana-v1: `src/pages/messages/GroupChat.tsx`, `src/components/messages/MessageBubble.tsx`, `src/lib/inAppLinks.ts` (new), `src/pages/community/EventsAndMeetups.tsx`, `src/hooks/useCommunityEvents.ts`, `src/lib/events/hotEvents.ts` (new), i18n shards (de/en/es/sr/ar) if new keys, tests, `docs/validation/<VTID>/`, staging spec under `e2e/`.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED — enrichment extracted to `enrichCommunityEvents`, used by both the list and the single-event fallback (L.3).
- F2 ACCEPTED — `slug?: string | null` added to `CommunityEvent` (L.3).
- F3 ACCEPTED (different remedy) — `window.history.length` is unreliable (counts pages before the app, e.g. the Appilix launcher); using React Router's public `useLocation().key !== 'default'` instead (G.4).
- F4 ACCEPTED — scope line reworded.
- F5 ACCEPTED — `global_community_events` is a table with the `is_community_user()` SELECT policy (not a view); stated explicitly that the new read uses it via the same anon/user client.
- F6 ACCEPTED — explicit "What's New: none, all fixes" section.
- Q2 ACCEPTED — member events created in the last 72h rank right after curated ones (E.1).

## Partner round 1 (summary of findings, verbatim ids)
- F1 [major] fallback-fetched single event lacks enrichment → ACCEPTED
- F2 [major] CommunityEvent has no slug field → ACCEPTED
- F3 [minor] window.history.state.idx is an RR internal → ACCEPTED (useLocation().key)
- F4 [minor] scope line "no DB" misleading → ACCEPTED
- F5 [minor] second query must keep RLS → ACCEPTED
- F6 [minor] What's New consideration → ACCEPTED (none, all fixes)
- Q2 recency of new member events → ACCEPTED

## Partner round 2
All six findings closed; no new blockers or majors. Verdict: CONVERGED.
