# Verification — VTID-05523 (native-wave2-ai-pages-r2 / ai-coach)

Native AI coach pages: `/ai` (AI.OVERVIEW), `/ai/insights` (AI.INSIGHTS), `/ai/recommendations`
(AI.RECOMMENDATIONS), `/ai/daily-summary` (AI.DAILY_SUMMARY), `/ai/companion` (AI.COMPANION) —
5 parity rows, 5 route files. Spec: vitana-platform `.kiro/specs/native-wave2-ai-pages-r2/`
(plan block + `tasks.md` `<!-- lane: ai-coach -->`), read from the plan branch while PR #4634 is open.

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and `apps/mobile/maestro/ai-coach/README.md`.
Everything below ran offline; every write is asserted as the built request against a mocked
gateway / Supabase double and nothing reaches a network (`tests/helpers/no-network`).

## What changed

| Area | Files |
|---|---|
| Routes | `apps/mobile/app/(app)/ai/{index,insights,recommendations,daily-summary,companion}.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + the 5 paths |
| Screens | `src/screens/ai-coach/{AIOverview,Insights,Recommendations,DailySummary,Companion}Screen.tsx`, `components.tsx` (sub-navigation, scaffold + headers, Index circle, card stack, RewardDot), `text.ts`, `cards/*` (CrossoverCard + ProgressStreaks / SmartCalendar / LifestylePlan / Motivation, SmartSuggestions, Standard / Recommendation / Offer / LabTest cards, VitanaIndexMini, AutopilotWidget, HealthCoachChat + AI-consent sheet) |
| Data | `src/screens/ai-coach/data/gateway.ts` (web `memory-api` fetchDailyLearnings, `coach-chat-api` sendCoachMessage, `useAutopilotComplete` — class B, re-implemented over `getGateway()` + the `X-Vitana-Active-Role: community` header), `data/hooks.ts` (useVitanaIndex incl. the compute-RPC self-heal + latest-ever fallback, useVitanaIndexHistory, useVitanaIndexConfig, calendar_events upcoming, user_preferences incl. the default-row insert, useAIConsent), `data/celebrate.ts` (the completion toast) |
| Port | `src/ports/ai-coach.tsx` — kit `Input` / `Progress` / `Tooltip` / `notifySuccess` / `useReducedMotion`, the category + status colours from `@vitana/tokens`, the lucide glyphs, and the web page data from `@vitana/core/ai-mocks` |
| Core | `packages/core/src/ai-mocks.ts` re-exports the class-A `src/mocks/ai.ts` (imports nothing); manifest line; `closure.generated.json` + `scripts/native/mobile-ci-paths.generated.json` regenerated |
| i18n | `src/i18n/*/aiCoachNative.json` — 35 keys, DE first (du-form), mirrored to ar en es fr pl pt ru sr tr zh; every other string reuses the web keys (`screens.ai.*`, `screens.crossover.*`, `screens.health.*`, `screens.templates.*`, `screens.common.*`, `autopilot.widget.*`, `vitanaIndex.*`) and the settings lane's `settingsNative.consent.*` |
| Ledger | `apps/mobile/parity/ledger.json` — the 5 AI.* rows `not_started` → `native` (owner kiro, 2026-11-03) |
| Tests | `apps/mobile/tests/ai-coach/**` (4 suites, 89 tests) |

No backend / gateway / migration change, no web screen touched, no shared shell test changed.

## Parity notes (mobile-web branch, 1:1)

Spotlight Tier B is desktop + flag only (`useSpotlightEnabled`), so the phone branch is ported.

- **Chrome:** the N3 shell is the web `MobileAppShell` (TopAppBar, drawer, bottom nav). These pages
  have no utility bar (no search / calendar / Life Compass / gift voucher): `AppLayout` +
  `SubNavigation` + header only (`src/pages/AI.tsx:181-205`, `src/pages/ai/*.tsx`), so none is rendered.
  No purchase surface on these pages: the offer, "Order now" and item presses only `console.log`
  (`AIRecommendations.tsx:29-56`), so there is no checkout, no external page and no IAP gate to keep.
- **`/ai`:** mobile `StandardHeader` is the title only (`StandardHeader.tsx:42-50`); the seven cards in
  order. `AutopilotPopup` is never opened (`setAutopilotOpen(true)` is not called, `AI.tsx:31`).
- **`/ai/insights`, `/ai/recommendations`, `/ai/daily-summary`, `/ai/companion`:** the header card +
  the `w-32` Index circle card (→ `/health-tracker/vitana-index`), stacked as on a phone (`lg:flex-row`).
  The Index value is the mock 72 (insights), the live Index (`VitanaIndexValue`, "…" while loading:
  recommendations, companion) or the latest 7-day score ("–": daily summary), as on the web.
- **Daily summary:** loading line → learnings (long weekday + day + month, start border) → empty line;
  a failed read leaves `learnings` undefined on the web, so it shows the empty line too.
- **Companion:** `completeBySourceRef('onboarding_maxina')` once per session on open; the coach chat
  card (quick actions fill the input, consent gate, `POST /conversation/turn` with the web body and the
  session thread id, `coachReplyFailed` toast, typing dots); the sidebar stacks below the chat.
- **Animations:** RewardDot `animate-pulse` + `animate-ping`, the typing dots' `animate-bounce`
  (all stopped under reduced motion); the RewardDot hover tooltip is the kit's long-press hint.

## Documented deviations / deferrals

- Strings the web prints as English literals on every locale (sub-navigation names, priority badge
  values, the SmartSuggestions default title, "AI-generated wellness suggestion", "Do Now", "Recall",
  the two autopilot suggestions, the default motivation quote, the reward tooltips, "computing…",
  the provider / category labels, the autopilot completion toasts) come from the new
  `aiCoachNative` catalog in all 11 locales. The mock records themselves are shown as the web shows
  them (German, from `@vitana/core/ai-mocks`).
- Prices and numbers use the member's locale (`Intl`), e.g. `$89` / `89 $`.
- The Vitana Index tier bounds are mirrored in `data/hooks.ts` (`tierLabelKey`) instead of a
  `@vitana/core` re-export of `src/lib/vitanaIndex.ts`: the health lanes (VTID-05455) add that exact
  manifest key in parallel, and a second lane adding it would collide in `manifest.json`. Swap to
  the core re-export once it is on main.
- Not ported (no native client yet): the card / navigation analytics (`withCardId`
  `analytics.trackImpression/trackClick`, `track('recommendation_clicked' / 'navigation_clicked')`,
  the pages' `console.log` events).
- `/ai/companion` big lift (web `src/lib/celebrate.ts:287-296`, `src/lib/confetti.ts:114-127`): when
  the lift magnitude is >= 10 (`BIG_LIFT_THRESHOLD`, celebrate.ts:97), reduce motion is off
  (`AccessibilityInfo.isReduceMotionEnabled`) and 5 minutes have passed since the last burst
  (celebrate.ts:99; timestamp in device storage under `vitana:celebrate:lastConfettiAt`), the lift
  toast is followed by a react-native `Animated` confetti burst (`cards/Confetti.tsx`, the web
  `reward_earned` physics: 150 particles, spread 90°, velocity 45, decay 0.94, gravity 0.3, 200 ticks)
  and the extra `toasts.common.success` toast. The web's three raw purples are the purple
  `--domain-discover-accent` token at three opacities. Tests: `tests/ai-coach/companion.test.tsx`
  "big-lift celebration" (red on 0a726a3: `red-fix1.txt`).
- Not ported: the big-lift sound `playSound("/audio/lift.mp3", 0.08)` (src/lib/celebrate.ts:295). The
  asset is not in the repo (`public/audio/` does not exist; `git ls-files | grep lift.mp3` is empty),
  so there is no file to bundle.
- The web `LabTestCard` category pill uses raw `bg-red-100 text-red-800`; native uses the
  destructive token. The RewardDot's raw purple is the purple `--domain-discover-accent` token.
