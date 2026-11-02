# Verification — VTID-05461 (native-wave2-journey-autopilot-r2 / journey)

Native Wave 2 journey lane: the `/autopilot` port (`AUTOPILOT.MY_JOURNEY`, the My Journey
dashboard with guided mode, the guided-journey catalog, the Autopilot popup and the goal
sheets). All commands run offline (the native app has no production profile;
`assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-journey-autopilot-r2-journey`, base
`origin/main` e530abd0d. Every command and its counts: `commands.log`. Red on base:
`red-on-base.txt`. Not verified on staging: device runtime is deferred to G1.

## What was built

- **Core (tasks.md task 1, plan decision 2).** `packages/core/src/horizon-buckets.ts` and
  `vitana-projection.ts` re-export the two class-A helpers named by the plan. R1.4 also says
  pure helpers are "reused from `@vitana/core`, never re-implemented", and the dashboard uses
  four more pure modules, so they go through core too: `goal-phases.ts` (`buildPhases`),
  `vitana-index-tiers.ts` (`getVitanaIndexTier`), `audiobook-queue.ts` (`AUDIOBOOK_SEASONS`,
  `seasonNumber`) and the extract entry `journey` (`buildJourneyRing`, `computeGoalTrend` and
  the `MyJourney*` / `GoalPlan*` types copied verbatim; `journeyRing.ts` / `goalTrend.ts`
  type-import class-B hooks, so the brief's extract path is used instead of `export *`). No hook
  or provider is extracted. `core-closure --write` run; both generated files committed.
- **Data, class-B re-implemented natively** (`apps/mobile/src/screens/journey/data/`):
  `client.ts` (`communityFetch` twin: Bearer + `X-Vitana-Active-Role: community` + JSON content
  type; `autopilotFetch`: the `getAuthHeaders` set incl. `X-User-ID`), `journey.ts`
  (`/my-journey`, the onboarding recommendations, goal plan read / generate / step complete,
  the curriculum, practice-complete, session-listened, `practiceTargetAction`), `supabase.ts`
  (`daily_matches` + profile RPC + `generate-daily-matches` + the viewed stamp,
  `global_community_events` + attendee counts, `life_compass` read / new version,
  `vitana_index_scores` + the self-heal compute RPC, `user_preferences`).
- **Providers / hooks (task 2)**: `providers/GuidedModeProvider.tsx` (mode cache in AsyncStorage,
  `GET /journey/state` resolution, the one-time default persist and `setMode` →
  `POST /journey/mode`), `hooks/useAutopilot.ts` (every Autopilot call, the client-dismissed set
  in the key-value store), `hooks/useGuidedJourneyProgress.ts` (journey state + listened /
  daily records in the key-value store), `hooks/useAIConsent.ts`.
- **Screen (tasks 3–4)**: `JourneyScreen.tsx` renders the mobile-web branch
  (AutopilotDashboard.tsx:539-556) section by section: header, utility bar (search + Autopilot
  chip; fix round 1 adds calendar, Life Compass, gift voucher, Index chip), `GuidedModeSwitch`,
  `DreamNorthStar` (the Spotlight hero), the card strip; Guided: `JourneyHowItWorks` + the
  AudiobookReminderControl slot + `GuidedJourneyCatalog` (topic drawer, practice); Full App:
  `FutureSelfTiles`, `TodaysGoalCard`, `MatchesPreview`, `EventsPreview`, `AutopilotCard`,
  "how you're doing" (`IndexNowCard` + `VitanaIndexTrajectoryCard`), "keep checking in";
  `AutopilotPopup` (+ consent dialog + draft sheet), `GoalSetupDialog`, `GoalPlanSheet`.
- **AI-content locale (R2.5)**: goal-plan generation sends `?locale=<member language>`
  (asserted: `de-DE`); the curriculum is requested in the UI locale. No prompt text is added.
- **i18n (task 5)**: every string from the web catalogs; the new strings are the AI-data
  consent dialog's (the web passes English fallbacks for keys that do not exist) and, in fix
  round 1, the web's English literals (VTNA toast, demo event titles, Index-chip and calendar
  badge labels) plus the popup error detail: 27 keys in `src/i18n/*/journeyAutopilotNative.json`,
  German first (du-form), 11 locales.
- **Route + ledger (task 7)**: `apps/mobile/app/(app)/autopilot/index.tsx`, `/autopilot` in
  `NATIVE_ROUTES`; no `app/` file shadows it (`app/index.tsx` redirects `/`;
  `app/(app)/[...path].tsx` ranks below a concrete file; the test asserts `/autopilot` resolves
  `native`). `AUTOPILOT.MY_JOURNEY` → `native` (owner kiro, 2026-11-02); `--sync` changed
  nothing else. `/autopilot/audiobook` stays `not_started` (sibling lane).

## Fix round 1 (review `journey-7c8eacd.md`, verdict `changes`)

R1.1 asks for 1:1 parity with the mobile web. Each item of the first head's "Not drawn" table,
now ported (tests: `apps/mobile/tests/journey/fix1.test.tsx`, red on 7c8eacd in `red-fix1.txt`):

| Web | Native now |
|---|---|
| Utility bar, AutopilotDashboard.tsx:452-475 + utility-action-button.tsx:97-123 | `UtilityBar.tsx`, one scrolling rail in the web order: Search pill (label `actionBar.search`) · `UniversalCalendarButton` (`calendar_events` for the member, upcoming badge first 10 with the 99+ rule, pulsing conflict dot, → /calendar) · Life Compass (`vitana:open-life-compass`) · Gift Voucher (hidden on iOS, the shell's `iapRestricted` rule, unchanged) · `VitanaIndexChip` (🧬 + Index value, 🔥N streak from 3 days from the device streak store `vitana:streak:active-days`, → `vitana:open-index`) · `AutopilotChip` (pulsing badge) |
| Gift voucher dialog, MaxinaVoucherModal.tsx:141-490 | `VoucherModal.tsx`: tier selection (catalog names + benefit arrays, €0.49 / €99 / €199), "Buy voucher · €N", loading, `stripe-create-voucher-checkout {tier, returnTo: '/autopilot'}` → Stripe in the system browser; failure → `voucher.toast.checkoutFailed` |
| `AudiobookReminderControl` in the Guided view, AutopilotDashboard.tsx:435 | Typed mount slot `JourneySlotsContext.AudiobookReminderControl` (seams.ts), rendered between how-it-works and the catalog. The native control is assigned to the `autopilot-audiobook` lane by the approved plan: tasks.md (plan branch `kiro/native-wave2-journey-autopilot-r2/plan` @ 8a86b1507) line 86 names `apps/mobile/src/screens/audiobook/AudiobookReminderControl.tsx` under that lane's task 2 (lines 82-87), and line 72 sets that lane `depends_on: journey`. A plan-approved lane split, not a descope |
| Card strip static feature cards, EnrichmentCardStrip.tsx:70-100 | `EnrichmentStrip.tsx` + `FeatureCards.tsx`: server cards first, then F1 / F2 / F3 / F9 not hidden on this device (`vitana.card.<type>.dismissed_at`, 7 days, session fallback), `maxCards` 3 |
| EventsPreview demo fallback, EventsPreview.tsx:44-52 | The first two `useDemoMatches` events (demo-group-1 / -2, useDemoMatches.ts:613-638), titles from `journeyAutopilotNative.demoEvents.*` (11 locales) |
| Daily-goal milestone modal + confetti, TodaysGoalCard.tsx:34-36, celebrate.ts:408-432, MilestoneCelebration.tsx:88-125 | `celebrate.ts` + `MilestoneCelebration.tsx`: once per local day (`vitana:celebrate:daily_goal:day`), dialog 🎉 / `toasts.dailyGoal.*` / Continue, confetti unless reduced motion (5-min throttle), `POST /api/v1/analytics/celebrate {kind, source, throttled}` |
| "+N VTNA earned!" toast, AutopilotPopup.tsx:340-343 | `journeyAutopilotNative.autopilot.vtnaEarned` with `{reward}` |
| Caption clipboard copy, AutopilotPopup.tsx:263-265 | React Native `Clipboard.setString` (core module, no new dependency) |
| Raw error text, AutopilotPopup.tsx:520 | The detail line names HTTP status / server / connection from the catalog; the raw message is never shown |
| Ring / glow motion, DreamNorthStar.tsx:516-527, :592-603; GoalProgressRing.tsx:140-151 | `motion.tsx` (react-native `Animated`): the rings ease in (1.4 s / 1.1 s), the guided start glow pulses (2.2 s), `animate-pulse` on the Autopilot badge, the conflict dot and the loading bar; reduced motion draws the end state |

Kept out, with proof that the mobile web does not show it:

- The celebration sound: celebrate.ts:427 calls `playSound("/audio/lift.mp3")`, but the repo has no
  `public/audio/` directory (only `public/sounds/`), so the mobile web plays nothing.
- The gift voucher's success / e-mail / PDF states: they run only on the Stripe return URL
  (MaxinaVoucherModal.tsx:112-130), built from the request `Origin`
  (supabase/functions/stripe-create-voucher-checkout/index.ts:147, :161). A native request sends
  none, so the return lands on https://vitana.app, where the web runs those states.
- The streak hook's milestone / at-risk celebrations (useVitanaStreaks.ts:127-160) fire only after
  a `vitana:index-lifted` credit, which comes from the web lift watcher (celebrate.ts:301, :457);
  no native module emits it (the native hook listens for it on the overlay bus).
- The web calendar button's own `calendar:open` listener: the native shell already handles it
  (MobileAppShell.tsx:50); a second listener would navigate twice.

**Blocked outside the lane paths (reported to the driver, not edited):** the ORB guided-topic
teaching-end listener (GuidedJourneyCatalog.tsx:200-237) and `focusGuidedTopic(topicId)`
(orbActivate.ts:79-83). The native ORB cannot start a session on a topic or report which topic's
teaching ended: `buildStartPayload` leaves the guided-topic field to N6e
(apps/mobile/src/orb/protocol.ts:239), `OrbController.open()` takes no arguments
(ui/orb-controller.ts:72), and `end_guided_topic_teaching` ends the session as a plain
`end_directive` with no topic id (session.ts:355-358). The fix needs `apps/mobile/src/orb/**`,
which is not in this lane's `paths`. Until then the hero / catalog open the ORB generically (the
web's own fallback for a widget without `focusGuidedTopic`, orbActivate.ts:85-93).

Not in the reviewer's list and unchanged: the Autopilot badge's last-seen pulse
(use-autopilot.ts:182-232) feeds other surfaces' chips; PillarDeltaBadges' English pillar names
use the catalog `vitanaIndex.<pillar>`; the goal deadline is an ISO text field (the kit has no
date picker); the hero also waits while the member is resolving (the web route sits behind
AuthGuard). Observation outside this lane: the shell's read-only `src/identity/GuidedModeProvider.tsx`
calls `gatewayGet('/api/v1/journey/state')`, and `createGatewayFetch` already prefixes `/api/v1`;
this lane does not touch it (its own provider calls `/journey/state`).

## Checks (counts in commands.log)

Fix round 1 (head after the fix commits): `npm run typecheck` 0 errors; `npx jest tests/journey`
3 suites / 94 tests; full `npm test` 87 suites / 2382 tests; the rest as below, all rerun green.
First head: `npx jest tests/journey` 2 suites / 65 tests; full `npm test` 86
suites / 2347 tests (one earlier full run had a load timeout in the untouched
`tests/memory/gateway-i18n.test.tsx`; it passes alone and in the rerun); `APP_PROFILE=development
npm run bundle` iOS + Android; `deps:check` up to date; `parity:check` OK (33 native routes);
`core-closure --check` and `gen-core-extract --check` up to date; root i18n checks, eslint on the
lane files, `npm run build`, locale chunking and `vitest src/i18n scripts/native` green.

## Deferred to G1 (`next_actor: owner`)

Maestro `apps/mobile/maestro/journey/*` (README), iOS simulator / Android emulator screenshots,
screenshot parity vs the 390×844 read-only staging web `/autopilot` — `staging-tests.json`.
