# VTID-04937 — Plan sparring record

- Plan Sparring Gate: VTID-04868. Partner: `plan-sparring-partner` (independent, read-only).
- Change class: standard. Rounds: 2.
- Final plan hash: `9d645d6f0504dc7530bafdfecb1b27a6ae6aa2f798f0fc4e530386c7d97fc7e5`
- Verdict: **converged**. Owner approval: in session 2026-10-06 ("yes, go ahead").
- VTID: first allocated as VTID-04927; that ledger row was reaped by the allocated-orphan
  reaper (status `deleted`, terminal) after its title update timed out, so the work was
  re-allocated as VTID-04937 (owner decision 2026-10-07, "Option 2").

## Final plan

<!-- plan:begin -->
## Problem (owner report, 2026-10-06)
1. In the News feed ("All" tab, feed v2), tapping anywhere on a community post card that is not
   the heart / comment count / likes row / kebab navigates to the author's profile (`/u/:id`).
   Expected: only the author's name (and avatar) opens the profile; every other tap opens the post
   itself so the member can like/comment/view the image.
2. After opening something from deep in the feed (posts 10–14 days old) and pressing the back
   arrow, the member lands at the top of the feed instead of the spot they left.

## Root causes (verified in code)
- `src/components/home/CommunityPostCard.tsx:106-109,264,270` — the whole `<Card>` is
  `role="button"` with `onClick={openProfile}` → `navigate(/u/${item.user_id})`. Author avatar +
  name (`:306-314`) are plain, non-interactive elements.
- A post detail route already exists: `/post/:source/:id` → `src/pages/PostDetail.tsx`, which
  renders the same `CommunityPostCard`. Its back arrow (`PostDetail.tsx:96`) does a forward PUSH
  to `/home/notif` (always the "All" tab, a new history entry) rather than going back.
- `src/pages/Home.tsx:273-280` — the scroll-memory effect's cleanup calls `remember()` on unmount.
  React runs passive-effect cleanups of an unmounted route AFTER the next route's DOM was committed,
  so `window.scrollY` read there is already clamped to the (short / Suspense-fallback) new page's
  height — it overwrites the good offset with ~0. Additionally the restore (`:257-271`) is a single
  `scrollTo` two frames after mount; deep in the feed, lazily-sized media (`FeedMedia` sizes from
  `onLoad`) means the document can still be shorter than the target, so the scroll is clamped, and
  the scroll listener then records the clamped value.

## Changes
1. `CommunityPostCard.tsx`
   - Card body click → `navigate(/post/${item.source}/${item.post_id}, { state: { fromFeed: true } })`
     (still calls `onOpen?.(item)`). Outer element becomes `role="article"` (no tabIndex); the
     timestamp becomes a `<button>` (aria-label `screens.postDetail.title`) for keyboard access.
   - Author avatar + name become a `<button>` that stops propagation and navigates to
     `/u/${item.user_id}` (aria-label = author name). All existing controls keep stopPropagation.
   - New optional prop `isDetail?: boolean` (used by PostDetail): card is not clickable /
     not `role="button"` (no self-navigation), content not line-clamped, comments section open by
     default.
   - Update the file header comment.
2. `PostDetail.tsx` — pass `isDetail`; back arrow: `navigate(-1)` when the feed opened it
   (`location.state?.fromFeed === true`, set by the card's navigate), otherwise keep the existing `/home/notif` fallback (cold
   notification deep link, keeps the useOrbFrontDoor carve-out).
3. `Home.tsx` scroll memory
   - Remove `remember()` from the unmount cleanup (the passive scroll listener already holds the
     latest true offset).
   - Robust restore: one `scrollTo(saved)` after two frames, then a `ResizeObserver` on
     `document.body` re-applies it only when the document height changes, until `scrollY` is within
     2px of the target, the user takes over (touchstart/wheel/keydown/pointerdown) or 2s elapse;
     the recorder ignores scroll events while restoring so a clamped value is never stored.
   - No other behaviour changes (keyed by tab, module-scope, per-session as today).
4. Tests
   - Vitest `CommunityPostCard.test.tsx`: body tap → `/post/post/<id>`; author name tap →
     `/u/<user>` only; heart/comment taps → no navigation; `isDetail` → no navigation + comments open.
   - Vitest for Home scroll memory logic (extract the restore into a small helper
     `src/lib/feed-scroll-restore.ts` with unit tests: retries until target reachable, gives up after
     timeout, cancels on user input).
   - Staging Playwright spec `tests/e2e/staging/vtid-XXXXX-feed-post-open.staging.spec.ts`
     (read-only: sign in, scroll the feed, tap a post body → URL `/post/...`, back → scrollY within
     tolerance of before; tap author name → `/u/...`). No writes: network guard per existing
     fixtures; no like/comment clicked.
   - `docs/validation/<VTID>/staging-tests.json` + `plan-sparring.md`.
5. i18n: no new user-visible strings (aria-label reuses author name). Run `npm run i18n:inventory`
   only if it changes.
6. What's New entry: not added — behavioural fix, not a new feature.

## Change class
standard (≥4 files: two components, one page, one helper, tests, staging spec, validation docs).
No migrations, routes, auth, .github, deploy, governance or LLM-routing files.

## Scope
Frontend only, `exafyltd/vitana-v1`: `src/components/home/CommunityPostCard.tsx`,
`src/pages/PostDetail.tsx`, `src/pages/Home.tsx`, new `src/lib/feed-scroll-restore.ts`, their tests,
one staging spec, `docs/validation/<VTID>/`.

## Out of scope
Legacy (feed-v2 off) `NewsArticleCard` community items; profile page's own post list
(`ProfilePostsTab`); match/performer cards (they intentionally open profiles).
<!-- plan:end -->

## Planner responses — round 1
- **F1 [major] ACCEPTED.** The feed passes `state: { fromFeed: true }` when it navigates to
  `/post/...`; PostDetail's back arrow uses `navigate(-1)` only when `location.state?.fromFeed`
  is set, otherwise keeps the `/home/notif` fallback. `location.key` is no longer used.
- **F2 [major] ACCEPTED (mechanism changed).** Verified: no `<ScrollRestoration>`, no
  `createBrowserRouter`, no global scroll-to-top in `src/` (grep `ScrollRestoration|scrollRestoration|createBrowserRouter`
  → none), so nothing in the router fights the restore. The restore no longer loops per frame:
  one `scrollTo` after two frames (as today), then a `ResizeObserver` on `document.body` re-applies
  it only when the document height changes, until scrollY is within 2px of target, the user takes
  over (touchstart/wheel/keydown/pointerdown), or a 2s cap. Recorder ignores scroll events while
  restoring.
- **F3 [minor] ACCEPTED.** Feed card outer element changes from `role="button"`/`tabIndex=0` to
  `role="article"` (pointer click on the body still opens the post). Keyboard/screen-reader access
  to "open post" is a real `<button>` on the timestamp (aria-label reuses existing
  `screens.postDetail.title` — no new string); the author avatar+name is a sibling `<button>`.
  No nested interactive inside a role=button any more.
- **F4 [minor] REJECTED.** The cleanup `remember()` is the bug in BOTH cases: on a tab switch the
  cleanup also runs after the new tab's content was committed, so it reads a clamped/new-tab
  offset too. The passive scroll listener has already recorded the old tab's last real offset; if
  no scroll happened since the restore, the map still holds that same restored value, which is the
  correct position. So removing it loses nothing.
- **F5 [minor] ACCEPTED (verified, no change).** There is no "read more" affordance or i18n string
  tied to `line-clamp-3` (`CommunityPostCard.tsx:300`); detail mode just drops the clamp.

## Round 1 — partner findings (summary of the verbatim findings)
- F1 [major] `location.key !== "default"` is not a reliable "came from the feed" signal; use a `location.state` marker.
- F2 [major] a per-frame scrollTo loop for 2s can jank; use a ResizeObserver; check for router scroll restoration.
- F3 [minor] a role="button" card containing another button is a nested-interactive violation (WCAG 4.1.2).
- F4 [minor] removing `remember()` from the cleanup may lose the old tab's position on a tab switch.
- F5 [minor] check whether line-clamp has a "read more" string that detail mode needs.
- Verdict: NOT CONVERGED (F1, F2).

## Round 2 — partner verdict
- F1 closed, F2 closed (no ScrollRestoration/createBrowserRouter in `src/`), F3 closed,
  F4 acknowledged (rejection accepted: the cleanup read is clamped on a tab switch too),
  F5 closed. No new blockers or majors.
- Verdict: **CONVERGED**.

## Implementation notes beyond the plan
- The card ignores clicks that bubble through React portals (kebab menu, report/edit dialogs,
  likers list) — `cardRef.contains(e.target)` — so those never open the post.
- `data-testid`s `feed-post-card`, `feed-post-author`, `post-detail-back` for the staging spec.
