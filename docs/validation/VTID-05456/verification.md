# Verification — VTID-05456 (native-wave2-health-biology-r3/health-plans-services)

Native port of the phone branch of five web health pages to the N3 shell; 16 parity rows flipped to `native`.
Not verified on staging: device runtime deferred to G1 (`next_actor: owner`, `staging-tests.json` `deferred_g1`).
Every command and its result is in `commands.log`.

## What is ported (web source → native)

| Ledger rows | Web (phone branch) | Native route → screen |
|---|---|---|
| HEALTH.PILLARS | `src/pages/health/PillarsOfHealth.tsx:58-107` | `app/(app)/health/pillars.tsx` → `PillarsOfHealthScreen` |
| HEALTH.CONDITIONS | `src/pages/health/ConditionsRisks.tsx:45-83` | `app/(app)/health/conditions.tsx` → `ConditionsRisksScreen` |
| HEALTH.EDUCATION, _VIDEOS, _PODCASTS | `src/pages/health/EducationResources.tsx:95-232` + `EducationMasterActionPopup.tsx` | `app/(app)/health/education.tsx` → `EducationResourcesScreen` |
| HEALTH.PLANS, _NUTRITION, _EXERCISE, _HYDRATION, _SLEEP, _MENTAL | `src/pages/health/Plans.tsx:190-383` + `PersonalizedPlanCard`, `CrossPlanRelationshipWidget`, the five `<Pillar>PlanView`s and their overview / daily / dashboard / empty-state cards | `app/(app)/health/plans.tsx` → `PlansScreen` |
| HEALTH.SERVICES_HUB, _MEDICAL, _WELLNESS, _INSURANCE, _MINE | `src/pages/health/WellnessServices.tsx:191-285` + `ServiceDetailDrawer.tsx` + `ServicesMasterActionPopup.tsx` | `app/(app)/health/services-hub.tsx` → `WellnessServicesScreen` |

`?tab=` picks the pane on open like the web `useUrlTab` (`src/hooks/useUrlTab.ts:19-24`); the health sub-navigation is
the web `healthNavigation` (`src/config/navigation.ts:50-56`). Every route is a concrete file under
`apps/mobile/app/(app)/health/`; nothing else under `app/` claims those paths, so each row resolves to its native screen
on a cold start (`tests/health/plans-services/routes-i18n.test.tsx`).

## Data: real reads in product code, reads only

- `user_health_plans`: `select('*').eq('active', true).order('created_at', { ascending: false })` through the native
  Supabase client, the read half of `src/hooks/useHealthPlans.ts:9-20`, same query key `['health-plans']`
  (`apps/mobile/src/screens/health/plans-services/data.ts`). RLS-scoped like the web.
- Vitana Index tile: `vitana_index_scores` trailing 7 days for `user_id = auth user`, else the latest-ever row, newest
  `score_total` (`src/hooks/useVitanaIndex.ts:88-145` → `VitanaIndexValue.tsx:10-13`).
- Tests use a Supabase double and assert the built requests (table, columns, filters, order, limit) and that no
  insert / update / upsert / delete / RPC / edge function is called on render or interaction.

## Descoped or changed, with evidence

1. **Plan generation (plan decision 3a, reads only).** Generate New Plan (`Plans.tsx:213-223`), each card's Generate
   Plan (`PersonalizedPlanCard.tsx:216-226`) and the empty states' Generate Plan (`*EmptyState.tsx`, e.g.
   `ExerciseEmptyState.tsx:29` `generatePlan.mutate`) start the `generate-personalized-plan` edge function. Natively
   they are shown **disabled**; `PlanGeneratorWizard` (`Plans.tsx:373-380`) is not ported. `updateAdherence` /
   `logAdherence` (`useHealthPlans.ts:40-85`) are not wired.
2. **Vitana Index compute RPC.** The web read calls `rpc('health_compute_vitana_index')` when the trailing window is
   empty (`useVitanaIndex.ts:116-127`), which upserts a score row. Natively the read goes straight to the latest-ever
   fallback (no health-data write).
3. **Book Now → BookingPaymentFlow.** The service sheet's Book Now opens a Stripe checkout via the
   `stripe-create-booking-checkout` edge function and reads the wallet (`ServiceDetailDrawer.tsx:188,320-347`,
   `BookingPaymentFlow.tsx:144-176`). That purchase flow is not part of this reads-only lane: the button is shown
   **disabled**. No iOS purchase gate changes (`apps/mobile/src/shell/logic/drawer.ts` `iapRestricted` untouched).
4. **Service detail for CT-302…CT-320.** The web drawer renders `mockServiceDetails[service.id] || service`
   (`ServiceDetailDrawer.tsx:117`) and maps `serviceDetail.features` (`:212`); only CT-301 has a record, so every
   other card throws inside the web drawer. Natively CT-301 opens the sheet and the other cards do nothing.
5. **Per-item detail overlays in the plan panes** are not ported, so those cards are not pressable: RecipeSheet + Cook
   Mode (`NutritionPlanView.tsx:98,111`), WorkoutModal (`ExercisePlanView.tsx:42,54`), HydrationModal
   (`HydrationPlanView.tsx:45,63`), SleepModal (`SleepPlanView.tsx:45,62`), MentalModal (`MentalPlanView.tsx:42,64`).
   Follow-up for a later lane.
6. **Utility-row search and calendar buttons** are not ported (as on `/memory`, VTID-05427):
   `ExpandableSearchButton` has no search handler (`EducationResources.tsx:113`, `WellnessServices.tsx:205`,
   `Plans.tsx:212`); `UniversalCalendarButton` is the calendar lane's popup (`EducationResources.tsx:114`,
   `WellnessServices.tsx:206`).
7. **Tooltips.** The Vitana Score breakdown (`VitanaScoreTooltip.tsx:27`) and the relationship explanations
   (`CrossPlanRelationshipWidget.tsx:51`) are Radix tooltips, which do not open on touch; on the phone they are plain
   text, and the native screen renders no tooltip.
8. **Education article keys.** The web asks for `screens.health.eduArticle_*`, `screens.health.eduCategory_*` and
   `screens.health.eduReadTime` (`EducationResources.tsx:134-141`), which no catalog has (they live under
   `screens.ai.*` in `src/i18n/<locale>/screens.json`), so the web shows the raw key path. The native cards read
   `screens.ai.*`, which hold the intended text.
9. **Pillars Index tile destination.** The web navigates to `/health-tracker/vitana-index` (`PillarsOfHealth.tsx:78`),
   which redirects to `/health/my-health-tracker` and then `/health` (`src/App.tsx:1169,1173`). The native tile opens
   `/health` directly.
10. **Unknown `?tab=` value.** The web shows an empty pane (no `SplitBarContent` matches); natively it falls back to
    the default tab (same as `/memory`).
11. **Web literals → catalog.** English literals the phone branch hard-codes (header descriptions
    `ConditionsRisks.tsx:54`, `EducationResources.tsx:108`, `Plans.tsx:207`, `WellnessServices.tsx:200`; the video /
    podcast samples `EducationResources.tsx:167-172,199-204`; the two action popups; plan names, relative times,
    toast descriptions and status labels in the plan cards) come from the new `healthNative` shard, English values
    identical to the web, DE first, 11 locales. Plan content (sample plans, recipe / workout names, AI notes,
    relationship impacts, the CT-301 detail) is data and renders as stored, as on the web.
12. **Colours.** Raw palette classes on the web (`from-blue-500/20`, `#10b981` dots, …) map to the nearest token
    (`status-*`, `category-*`, `pill-<pillar>-accent`) through `src/ports/health-plans.tsx`.

## Deviation from the lane file

`lanes/health-plans-services.md` says these screens read no health data and add no core re-export. The converged
`plan.md` (decision 3, s2-round-1 R1-F1/R1-F2) says `Plans.tsx` reads `user_health_plans` and `PillarsOfHealth.tsx`
renders the Vitana Index value, via health-hub's native module. health-hub is being built in parallel and is not on
`main`, so this lane makes both reads itself in `src/screens/health/plans-services/data.ts` (no health-hub file
touched). When health-hub's native Vitana Index module lands, `useVitanaIndexTotal` can delegate to it. The pure sample
plans / Autopilot context / service detail go through `@vitana/core/health-plans` (7 manifest entries + 1 extract) so
no web data is hand-copied; `packages/core/**` and `mobile-ci-paths.generated.json` are in the lane `paths`.

## Shared files

`apps/mobile/parity/ledger.json` (only the 16 rows), `apps/mobile/src/navigation/resolve.ts` (5 `NATIVE_ROUTES`
lines), `packages/core/{manifest,extract,closure.generated}.json`, `scripts/native/mobile-ci-paths.generated.json`. On a
merge conflict with the sibling lanes keep both sides and rerun `npm run gen:core`.
