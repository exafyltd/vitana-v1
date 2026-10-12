# Plan sparring record — VTID-05081

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard (App.tsx route tree, Home.tsx, a new component, 4 hooks/components); rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers): a3a3be195ece382572f05ea8a10d289d0977c4f84efc3d5e97d5436645393f6a
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat 2026-10-12 yes
- Parent: VTID-05062 (phone journey robot) / VTID-05066 (Events, Postfach fixed; News return still failing on STAGING-VERIFY 38139719352)

## Rounds
- R1: F1, F2 major (hidden News re-rendered / read other routes' URL) ACCEPTED → frozen location via `UNSAFE_LocationContext` + `React.memo`; F3–F5 minor ACCEPTED (scroll restore spelled out, deferred teardown re-check, single JSX insertion in App.tsx).
- R2: F1–F5 closed; F6, F7 minor ACCEPTED (react-router v7 revisit comment; relative navigation note) → CONVERGED.

## Plan and planner responses (verbatim)

# Plan — Returning to News is instant: keep the News content alive, stop the per-switch request storm

<!-- plan:begin -->
## Problem (measured on staging, VTID-05062 phone journey, Pixel 7 · 4× CPU · Fast 4G)
After VTID-05066, Events and Postfach pass. Only **News return** fails: 4.3–5.6 s vs the 1.5 s budget
(STAGING-VERIFY 38139719352, community-app @ 828c6eb). That step fires 212–259 requests; the robot waited on an
`.animate-spin` svg and on `/vitana-orb-clean.svg`; largest downloads were `rest/v1/chat_messages` (111 KB),
`/api/v1/intent-board` (92 KB), `calendar_events`. Owner decision 2026-10-12: keep News alive across tab switches
(no rebuild, no refetch storm, no spinner on return); robot budgets unchanged.

Root cause (code): every page wraps its own `AppLayout`, so a tab switch unmounts `AuthGuard → ProtectedRoute →
AppLayout → Home` (`App.tsx:942-948`, `Home.tsx:550/624`, `MobileBottomNav.tsx:139-141`). The feed DATA is kept
warm (`useNewsFeedKeepAlive`, `App.tsx:481`), but on each return:
- `useBackgroundPrefetch` (`AppLayout.tsx:466`) re-runs all 8 `ADJACENT_PILLARS['/home']` prefetches because its
  "once" guard is a per-instance `useRef` (`useBackgroundPrefetch.ts:24,42-44`) — intent-board, global-threads /
  global-messages (`chat_messages … limit(2000)`, `useGlobalMessages.ts:543-575`), …
- `ProtectedRoute`'s `settled` is a per-instance `useRef` (`ProtectedRoute.tsx:20-29`): a fresh mount shows
  `DelayedLoader`'s `animate-spin` (rendered at opacity 0 for 400 ms, `DelayedLoader.tsx:39-43`) whenever the
  role query has no data yet (e.g. its RPC failed) — likely the spinner the robot saw (to be confirmed by a test id).
- Home's children rebuild: `UniversalCalendarButton` → `useCalendarEvents` refetches on every mount
  (`useCalendarEvents.ts:108-123,754-756`, plain useState); every first-viewport `<img>` (DidYouKnow's ORB icon,
  `VitanaRecommendationHeader.tsx:70-76`) is created anew on a throttled CPU.
- `useChatUnreadCount` tears down its store when the listener count hits 0 on unmount and re-inits (fetch +
  re-subscribe) on the next mount (`useChatUnreadCount.ts:123-148,162-167`).

## Change class
`standard` — App.tsx (route tree, high bug history), Home.tsx, new component, 4 hooks/components; no migrations,
routes added/removed, auth logic, `.github`, governance or LLM routing.

## Change
1. **Keep News content alive (no second AppLayout).** New `src/components/keepalive/NewsKeepAlive.tsx`:
   - `NewsKeepAliveHost` (mounted once as a sibling of `<Routes>` inside `GlobalErrorBoundary`, `App.tsx:~809`)
     owns one stable `div` (`document.createElement`) and renders `createPortal(<HomeContent/>, stableDiv)` inside
     its own `<Suspense fallback={null}>`. It mounts only after the first `/home` visit by a signed-in user with
     community permission, is keyed by `user.id + activeTenantId`, and unmounts on sign-out.
   - `NewsKeepAliveSlot` (rendered by the `/home` route inside its normal `AuthGuard → ProtectedRoute → AppLayout`)
     attaches `stableDiv` in a layout effect and detaches it on unmount. Exactly one AppLayout exists at any time.
   - `useNewsActive()` context (true only while the slot is attached).
   - **Frozen location.** The host renders `HomeContent` under a location override
     (`UNSAFE_LocationContext.Provider` from react-router v6) whose value is the last `/home*` location and is
     referentially frozen while inactive. `useLocation`/`useSearchParams` inside News therefore never see another
     route's URL (no `?tab` reset, no foreign `track` impressions), and because the context value does not change
     while inactive, a navigation elsewhere does not re-render the hidden News tree at all. `HomeContent` is wrapped
     in `React.memo` (no props besides the stable key), so the host's own re-render on navigation stops there.
     Navigation (`useNavigate`, `<Link>`) still uses the real router (NavigationContext is not overridden); every
     `navigate()` inside News uses absolute paths (relative ones would resolve against the frozen `/home`
     location — noted in a code comment). The override site carries a `revisit on react-router v7` comment
     (`UNSAFE_LocationContext`, react-router 6.30.1 pinned `^6`).
   `src/pages/Home.tsx` is split into `HomeContent` (today's body) and a thin `Home` = `<AppLayout><NewsKeepAliveSlot/></AppLayout>`.
   Inside `HomeContent`, while inactive: the URL-driven effects (`?tab` sync, compose, `/home/compose`,
   `/home/comments`, track — `Home.tsx:95-182`) return early; `<SEO>` is not rendered (title stays the active
   route's); popups/sheets (`Home.tsx:614-623`) are closed/not rendered; the scroll listener (`:274-281`) is
   detached; scroll is saved in the slot's layout cleanup (`feedScrollMemory.set(activeTab, scrollY)`) and the
   slot's attach layout effect restores `feedScrollMemory.get(activeTab) ?? 0` with the same double-rAF pattern;
   the existing `activeTab` effect (`Home.tsx:258-272`) is left as is (it handles tab changes within News, a
   different case from a cross-route return); `UniversalCalendarButton`'s `calendar:open` overlay listener is passed `enabled=active`
   (`overlay-bus.ts:79` already supports it); `FeedMedia` pauses its videos when inactive.
2. **Prefetch once per session (B1).** `useBackgroundPrefetch`'s dedupe becomes module-level, keyed by
   user + tenant (+ pillar path), so remounting AppLayout does not re-run the pillar fan-out; a user/tenant change
   resets it. Staleness rules of each prefetch are unchanged.
3. **No spinner on a remounted guard (B3).** `ProtectedRoute` remembers "settled" in module scope per
   user + session, so a remount after the role has resolved (or errored) once renders children immediately; a
   hard reload starts fresh, preserving VTID-03909/04867 behaviour. `DelayedLoader` gets `data-testid` so the
   robot names it in `blockers()`.
4. **Unread badge survives a route swap (B4).** `useChatUnreadCount` defers `teardown()` by one macrotask; the
   timer is cleared when a new listener registers, and the callback re-checks `listeners.size === 0` before tearing
   down (so a remount split across commits by Suspense still keeps the store). A tab switch does not refetch or
   re-subscribe.

## Out of scope
`useCalendarEvents` → React Query (B2, wider blast radius; the kept-alive calendar button no longer refetches on
News return, which is the measured need); keeping other tabs alive; first-load LCP; budgets.

## Files
vitana-v1: `src/App.tsx` (a single JSX insertion — `<NewsKeepAliveHost />` as a sibling of `<Routes>`; no
existing route or logic changed; App.tsx is a known hotspot, so the diff stays one element), `src/pages/Home.tsx`, new `src/components/keepalive/NewsKeepAlive.tsx`
(+ test), `src/components/UniversalCalendarButton.tsx`, `src/components/media/FeedMedia.tsx`,
`src/hooks/useBackgroundPrefetch.ts` (+ test), `src/components/ProtectedRoute.tsx` (+ test extension),
`src/components/ui/DelayedLoader.tsx` (test id), `src/hooks/useChatUnreadCount.ts` (+ test),
`tests/e2e/staging/screen-journey.staging.spec.ts` (diagnostics only), `docs/validation/<VTID>/*`.

## Test plan
- Vitest: a navigation elsewhere does not re-render the hidden `HomeContent` (render-count spy stays flat while on
  /inbox → /comm/events-meetups); `/home → /inbox → /home` mounts `HomeContent` once (render spy) and reattaches the same DOM node; only
  one AppLayout / bottom nav at a time; a hidden Home ignores other routes' `?tab`; `document.title` follows the
  active route; `calendar:open` navigates once; sign-out / user switch unmounts the host; scroll saved and
  restored; prefetch runs once per pillar across two AppLayout mounts and again after a user change;
  ProtectedRoute: first-ever mount still shows the loader, a later remount with loading role renders children;
  unread count: unmount + remount in one tick does not refetch. Existing ProtectedRoute/useRole/feed/card tests green.
- Staging: STAGING-VERIFY community-app with the phone journey at unchanged budgets (News return ≤ 1.5 s, no
  photo re-download, no frame jump); the News step's network summary logged.
- Manual-equivalent on staging via the robot screenshots: News scroll position kept across the journey.
- Visual: before/after screenshots of News at 390 px attached before Gate 2.
<!-- plan:end -->

## Planner responses — round 1
- F1 [major] ACCEPTED: frozen location (`UNSAFE_LocationContext.Provider`, value frozen while inactive) +
  `React.memo` on `HomeContent`; a navigation elsewhere does not re-render the hidden tree. Test added (render
  count flat across /inbox → /comm/events-meetups). Q1: no re-render happens, so there is no per-navigation cost to
  measure; the robot's News-return step measures the end result.
- F2 [major] ACCEPTED: same mechanism; `useLocation`/`useSearchParams` inside News only ever see the last `/home*`
  location, so `?tab` is never reset and `track` never fires for other routes. Q2: the hooks stay as they are; the
  override suppresses foreign values and re-renders entirely (the context value does not change while inactive).
- F3 [minor] ACCEPTED: restore specified (slot attach → `feedScrollMemory.get(activeTab) ?? 0`, double rAF);
  the existing `activeTab` effect is left unchanged.
- F4 [minor] ACCEPTED: Q3 — both: the timer is cleared on a new registration, and the callback re-checks
  `listeners.size === 0`.
- F5 [minor] ACCEPTED: App.tsx change is a single JSX insertion; stated in Files.

## Planner responses — round 2
- F6 [minor] ACCEPTED: code comment at the override site (revisit on a react-router v7 migration, its own VTID).
- F7 [minor] ACCEPTED: News navigation is absolute today (`/news/${id}`, `/home`, `calendarTargetFor()`); a code
  comment records that relative navigation inside the frozen subtree resolves against the frozen location.

## Verdict
CONVERGED — 2 rounds (standard). R1: F1, F2 majors and F3–F5 minors accepted; R2: all closed, F6/F7 minors accepted.

## Amendment A1 (2026-10-12) — scope growth found in implementation, sparred with the same partner
- Edge-swipe drawer: portaled News content no longer reached MobileAppShell's React touch props; switched to native passive listeners on the shell's content div. Test fails on the old shell, passes on the new.
- Partner verdict: CONVERGED (premise verified; F8 minor — exhaustive-deps lint — checked: ESLint clean on the file).

## Amendment A1 — edge-swipe drawer keeps working on News (2026-10-12, found during implementation)
React synthetic events bubble along the React tree, not the DOM tree. `HomeContent` is now a portal rendered by
`NewsKeepAliveHost` (outside `<Routes>`), so touches on News content no longer reach `MobileAppShell`'s
`onTouchStart`/`onTouchEnd` (`src/components/mobile/MobileAppShell.tsx:29-49`) even though the portal's DOM node
sits inside that shell's `<div>`. Result: the left-edge swipe that opens the side drawer would stop working on
News (the menu button still works).
Change (one file): `MobileAppShell` attaches the same two handlers as native `touchstart`/`touchend` listeners
(`{ passive: true }`) on its content `<div>` via a ref in a `useEffect`, instead of React props. Native events
bubble through the DOM, so they arrive from the portaled News content as from any other screen. Logic and
thresholds unchanged (`x < 30`, `deltaX > 50`, `deltaX > deltaY`). Test: Vitest — a native edge swipe dispatched
on a node inside the shell opens the drawer, a short or vertical swipe does not; the existing behaviour on other
screens is unchanged.
