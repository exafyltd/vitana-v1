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
  chip), `GuidedModeSwitch`, `DreamNorthStar` (the Spotlight hero), the card strip; Guided:
  `JourneyHowItWorks` + `GuidedJourneyCatalog` (topic drawer, practice); Full App:
  `FutureSelfTiles`, `TodaysGoalCard`, `MatchesPreview`, `EventsPreview`, `AutopilotCard`,
  "how you're doing" (`IndexNowCard` + `VitanaIndexTrajectoryCard`), "keep checking in";
  `AutopilotPopup` (+ consent dialog + draft sheet), `GoalSetupDialog`, `GoalPlanSheet`.
- **AI-content locale (R2.5)**: goal-plan generation sends `?locale=<member language>`
  (asserted: `de-DE`); the curriculum is requested in the UI locale. No prompt text is added.
- **i18n (task 5)**: every string from the web catalogs; the only new strings are the AI-data
  consent dialog's (the web passes English fallbacks for keys that do not exist), 18 keys in
  `src/i18n/*/journeyAutopilotNative.json`, German first (du-form), 11 locales.
- **Route + ledger (task 7)**: `apps/mobile/app/(app)/autopilot/index.tsx`, `/autopilot` in
  `NATIVE_ROUTES`; no `app/` file shadows it (`app/index.tsx` redirects `/`;
  `app/(app)/[...path].tsx` ranks below a concrete file; the test asserts `/autopilot` resolves
  `native`). `AUTOPILOT.MY_JOURNEY` → `native` (owner kiro, 2026-11-02); `--sync` changed
  nothing else. `/autopilot/audiobook` stays `not_started` (sibling lane).

## Not drawn, with evidence (R1.1: nothing added; these are web surfaces this lane does not own or cannot carry)

| Web | Evidence | Native |
|---|---|---|
| `AudiobookReminderControl` in the guided view | AutopilotDashboard.tsx:435; tasks.md autopilot-audiobook task 2 | the sibling lane's |
| `?audiobook=play` / `/autopilot/audiobook` player start | AutopilotDashboard.tsx:178-189 | the sibling lane's route; the player plugs in via `JourneyAudiobookContext` (seams.ts); until then the web's no-player branches run (AutopilotDashboard.tsx:308-311 → ORB; GuidedJourneyCatalog.tsx:294-297 → lesson; :383 play badge hidden) |
| VitanaIndexChip, UniversalCalendarButton, gift voucher in the utility bar | AutopilotDashboard.tsx:452-475; MobileActionChips.tsx:18-48 | other lanes' surfaces (same deferral as the home / diary lanes); search + AutopilotChip ported |
| Card strip static feature cards F1/F2/F3/F9 | EnrichmentCardStrip.tsx:85-87; vitana-card-catalog.ts:195 | server cards ported (home lane's card); the static cards have no native twin |
| EventsPreview demo-event fallback | EventsPreview.tsx:44-52; useDemoMatches.ts:613-743 | hardcoded English titles (native i18n rule); empty line shown instead |
| Daily-goal celebration (milestone modal + confetti) | TodaysGoalCard.tsx:34-36; celebrate.ts:408-432 | app-wide celebration layer, no native twin |
| ORB teaching-end listener | GuidedJourneyCatalog.tsx:200-237 | the native ORB emits no such event |
| ORB `focusGuidedTopic(topicId)` | orbActivate.ts | native ORB opens generically (the web's fallback) |
| "+N VTNA earned!" toast; caption clipboard copy; raw error text | AutopilotPopup.tsx:342, :265, :520 | English literal / no clipboard module / raw message not shown |
| Autopilot badge pulse (last-seen count) | use-autopilot.ts:182-232 | feeds other surfaces' chips, not rendered here |
| Framer-motion ring / glow animation; pastel hex gradients | DreamNorthStar.tsx, GoalProgressRing.tsx | static rings; colours from tokens |

Other deviations: PillarDeltaBadges' English pillar names (PillarDeltaBadges.tsx:6-12) use the
catalog `vitanaIndex.<pillar>`; the goal deadline is an ISO text field (the kit has no date
picker); the hero also waits while the member is resolving (the web route sits behind
AuthGuard). Observation outside this lane: the shell's read-only `src/identity/GuidedModeProvider.tsx`
calls `gatewayGet('/api/v1/journey/state')`, and `createGatewayFetch` already prefixes `/api/v1`;
this lane does not touch it (its own provider calls `/journey/state`).

## Checks (counts in commands.log)

`npm run typecheck` 0 errors; `npx jest tests/journey` 2 suites / 65 tests; full `npm test` 86
suites / 2347 tests (one earlier full run had a load timeout in the untouched
`tests/memory/gateway-i18n.test.tsx`; it passes alone and in the rerun); `APP_PROFILE=development
npm run bundle` iOS + Android; `deps:check` up to date; `parity:check` OK (33 native routes);
`core-closure --check` and `gen-core-extract --check` up to date; root i18n checks, eslint on the
lane files, `npm run build`, locale chunking and `vitest src/i18n scripts/native` green.

## Deferred to G1 (`next_actor: owner`)

Maestro `apps/mobile/maestro/journey/*` (README), iOS simulator / Android emulator screenshots,
screenshot parity vs the 390×844 read-only staging web `/autopilot` — `staging-tests.json`.
