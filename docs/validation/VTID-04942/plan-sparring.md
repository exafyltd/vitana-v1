# Plan sparring — VTID-04942

Plan hash (sha256 of the text between the plan markers, first 16 hex): `e8d944bc7490514d`
Partner: plan-sparring-partner (independent, read-only). Class: standard. Rounds: 2.
Verdict: **CONVERGED** — round 1: 4 minor findings (F1 accepted, F2 rejected with reason, F3 accepted, F4 accepted → new staging spec); round 2: all closed, no blocker/major, spec feasibility verified by the partner (EventsAndMeetups.tsx onOpenDrawer → LiveRoomEventDrawer).
Owner instruction: "yes, run the sparring and allocate the VTID" (chat, 2026-10-07).

---

# Plan: Live Room drawer "who's going" row shows real people and opens the list

Repo: exafyltd/vitana-v1 (PR #1260, branch ccr-053765bd-j6ls96). Change class: **standard**.
Scope: `src/components/liverooms/LiveRoomDrawer.tsx`, `src/components/liverooms/LiveRoomDrawer.people.test.tsx`,
`docs/validation/<VTID>/{plan-sparring.md,staging-tests.json}`. No migrations, routes, auth, workflows, backend.

<!-- plan:begin -->
**Problem (owner report, screenshot):** a member created a scheduled Live Room and 10 people tapped "Notify me".
In the room's detail drawer the listeners row shows placeholder avatars "U1…U5" and a count; tapping does nothing,
so the participants cannot be seen.

**Premises (to verify against code):**
1. Drawer row is in `LiveRoomDrawer.tsx` (section "People Listening"); it rendered `Array.from({length: min(count,5)})` fallback avatars "U{i+1}" with no onClick.
2. `InterestedPeopleSheet` + hook `useStreamSubscribers` + RPC `get_live_stream_subscribers` (migration 20261006130000, VTID-04912) already exist and are used by `LiveRoomCard` and `LiveRoomEventCard`; the RPC is signed-in only, pending/live streams only, excludes test/bot accounts, max 200.
3. For a scheduled room the drawer count is `subscriberCount` (live_stream_subscribers); for a live room it is `room.participants` (viewers), which is NOT a people list.

**Change (already implemented in commit ead407b on the branch):**
- Scheduled rooms: row becomes a `<button>`; shows up to 5 real subscriber avatars/initials from `useStreamSubscribers(room.id, open && scheduled)`; click opens `InterestedPeopleSheet`. Chevron is RTL-flipped. The sheet is wrapped in a div that stops click/key/touch propagation so list interaction cannot trigger the drawer's swipe-to-next-room handlers.
- Live rooms: plain viewer-count text, no fake avatars, not tappable.
- No new i18n strings (reuses `willJoinCount`, `anonymousHost`, `interestedTitle`). No What's New card (bug fix).
- New Vitest `LiveRoomDrawer.people.test.tsx` (real initials shown, no "U1", tap opens list with 2 people, live room has no trigger).

**Governance deliverables to add in this PR:**
- Allocate one VTID (owner approval of this sparred plan is the instruction), put it in the PR title and commit message.
- `docs/validation/<VTID>/plan-sparring.md` (this record) and `docs/validation/<VTID>/staging-tests.json` referencing the Vitest file as an `existing` entry (no Playwright spec: a scheduled room with subscribers is not guaranteed to exist on staging, and staging suites are read-only and may not create one).

**Out of scope:** backend/RPC changes, showing viewer lists for live rooms, pagination beyond the hook's limit of 100 (RPC caps at 200).

**Verification already run:** vitest `src/components/liverooms` 15/15, tsc and eslint clean on touched files.
<!-- plan:end -->

## Planner responses (round 1)
- **F1 ACCEPTED** — plan wording changed: "out of scope: pagination beyond the hook's limit of 100 (RPC caps at 200)". (Edited in the PR record; design unchanged.)
- **F2 REJECTED** — the wrapper already carries the comment "Portal events bubble through React: keep taps/swipes in the list from reaching the drawer's swipe-to-next-room handlers" (LiveRoomDrawer.tsx), which states the why. Same pattern as LiveRoomCard.
- **F3 ACCEPTED** — add one assertion in the Vitest that the chevron carries `rtl:rotate-180`.
- **F4 ACCEPTED, plan changed** — the 04912 spec only reaches the card (`live-room-interested` chip), never the drawer. A new read-only Playwright spec `tests/e2e/staging/vtid-<n>-live-room-drawer-people.staging.spec.ts` will be added, copying the 04912 pattern: sign in, GET one real scheduled room (skip if none), answer the two RPCs inside the browser with two demo people, open the room's drawer from Events, assert `drawer-interested-trigger` shows the demo initials (no "U1"), click it, assert `interested-people-list` has 2 people, Escape closes. Nothing is written. staging-tests.json lists this spec plus the Vitest `existing` entry.
- Answer to question 1: no, 04912 does not open the drawer; hence the new spec rather than extending it.
