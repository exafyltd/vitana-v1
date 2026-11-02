# Verification — VTID-05457 (native-wave2-health-biology-r3 / vitana-index-biology)

Native Wave 2 lane: the Vitana Index detail page (`HEALTH.VITANA_INDEX /health/vitana-index`) and the biology
screen (`HEALTH.MY_BIOLOGY /health/my-biology`, `HEALTH.BIOLOGY_OMICS ?tab=omics`, `HEALTH.BIOLOGY_SUPPLEMENTS
?tab=supplements`), 1:1 ports of the phone branches of `src/pages/health/VitanaIndexDetail.tsx` (:684-727) and
`src/pages/health/MyBiology.tsx` (:459-763). **Stacked on #1562** (health-hub, VTID-05455): the branch starts at
`origin/kiro/native-wave2-health-biology-r3/health-hub` cda3e39f0 and lands after it. All commands ran offline;
every command and its counts are in `commands.log`.

## What was built

- **Screens** `apps/mobile/src/screens/health/VitanaIndexDetailScreen.tsx`, `MyBiologyScreen.tsx` and their parts in
  `apps/mobile/src/screens/health/index-biology/` (`next-steps.ts`, `data.ts`, `dialogs.tsx`, `chrome.tsx`,
  `VitanaCardStrip.tsx`, `MissionAlignmentCard.tsx`).
- **Routes** `apps/mobile/app/(app)/health/vitana-index.tsx`, `my-biology.tsx`; both paths in `NATIVE_ROUTES`. A
  cold-start deep link to `/health/vitana-index`, `/health/my-biology`, `?tab=omics`, `?tab=supplements` resolves
  `native` (tests/health/vitana-index-biology/i18n-routes.test.tsx). The health-hub Index sheet's "Understand" row
  and the biology links on the Index page now land on native screens.
- **Port** `apps/mobile/src/ports/health-biology.tsx`: kit Select / Textarea / Label, the card-catalog bits, the
  supplement catalogue from core, the surface tokens, the extra lucide glyphs.
- **Core** `packages/core/src/supplement-categories.ts` (class A, imports nothing) + manifest line + regenerated
  `closure.generated.json` / `mobile-ci-paths.generated.json`.
- **Reuse of health-hub (no health-hub file edited):** `useVitanaIndex` (the one shared Index subscription),
  `useLabReports`, `useUserSupplements`, `HealthReportUploadSheet`, `HealthSyncAffordance` (via
  `ports/health-data.ts`), `VitanaPillarAgentsPanel` (widgets.tsx), `ExpandableSearchButton`,
  `UniversalCalendarButton`, `isIAPRestricted` (HealthUtilityBar.tsx), `openLifeCompass` / `openGiftVoucher`
  (events.ts), `useHealthText`, the health port. The card strip reuses the home lane's native `useEnrichmentCards`.
- **Ledger:** the 4 rows → `native` (owner kiro, 2026-11-02); `parity-ledger --sync` changes nothing.
- **i18n:** 37 new keys under `healthNative.indexDetail.*` and `healthNative.biology.*`, German first (du-form),
  mirrored to all 11 locales (pt você, fr tu, ru ты, ar RTL). Everything else reuses web keys
  (`vitanaIndexPage.*`, `screens.health.*`, `screens.supplements.*`, `screens.vitanaCards.*`,
  `screens.vitanaIdentity.*`, `spotlightTierB.health.*`, `subNav.*`, `vitanaIndex.*`, `profile.indexHero.ofMax`).

## R1.1 inventory — everything the mobile web renders on these screens

### `/health/vitana-index` (VitanaIndexDetail.tsx phone branch)
| Web (file:line) | Native |
|---|---|
| Hero (:151-268): eyebrow, title, glow, score / skeleton, "of 999", tier badge, Rising / Slight dip chip, hero line, 7-day sparkline (RTL-mirrored), "Log today", refresh, "Updated {date}" | `Hero`, `Sparkline` (react-native-svg) |
| Load-error banner (:696-698) | `vitana-index-error` |
| `EnrichmentCardStrip screen="vitana-index"` (:701; EnrichmentCardStrip.tsx, card-registry, VitanaActionCard, boost-metric) | `VitanaCardStrip`: server cards (placement rule, G3 streak metric), F3 / F4 / F6, max 3, nothing while loading / when empty, identity row + eyebrow + action |
| NextSteps (:270-361): Next up, open steps, done steps struck through, "all done"; blood CTA → upload sheet, "No recent blood test?" → /health/my-biology; devices CTA → /connectors?tab=fitness + tracker chips; focus CTA → log dialog; journey → /autopilot | `NextSteps`, `StepBody` |
| GoalCard (:363-424): line, progress bar (min 3 %), 600+ / 800+, compass note | `GoalCard` |
| PillarsCard (:426-506): five rows, value/200, bar, biggest lever, strongest, description, balance note, "Log data" | `PillarsCard` |
| VitanaPillarAgentsPanel (:710) | health-hub's `VitanaPillarAgentsPanel` |
| MissionAlignmentCard (:711; MissionAlignmentCard.tsx): title, subtitle, contract link, loading / error / empty, summary, pillar + economy bars with width transition | `MissionAlignmentCard` (Animated width, 200 ms) |
| HowItWorks (:508-566): toggle with rotating chevron, five rows, journey link | `HowItWorks` (Animated rotation) |
| VitanaLogDataDialog (:717; VitanaLogDataDialog.tsx) | `VitanaLogDataDialog` (submit disabled) |
| HealthReportUploadSheet blood_panel (:718-726) | health-hub's sheet (submit disabled) |

### `/health/my-biology` (MyBiology.tsx phone branch)
| Web (file:line) | Native |
|---|---|
| `SubNavigation items={healthNavigation}` (:466) | `HealthSubNav` (catalog `subNav.*` labels) |
| `StandardHeader` (:470) — on a phone the title only (StandardHeader.tsx:42-48) | `MobileStandardHeader` |
| UtilityActionButton (:476-487): Search, Calendar (+ badge / conflict dot), Add Data; global Life Compass, Gift Voucher (hidden when IAP-restricted) | `BiologyUtilityBar` (health-hub's search / calendar twins; `isIAPRestricted`) |
| SplitBar medical / omics / supplements via `useUrlTab("tab","medical")` (:489-500) | `SplitBar` + `?tab=` read / write-back |
| Medical / omics panels (:502-631): title + subtitle, Upload PDF / Upload Results, Connect Device / Connect API, error state + retry, report cards (icon, title, type + status badges, date, provider), empty state + CTA | `ReportsPane`, `ReportCard`, health-hub's `HealthSyncAffordance` |
| Supplements panel (:633-727): Add Supplement, category Select (all + every category with count), loading text, cards (pencil → edit dialog, delete), empty text, Your Active Categories chips | `SupplementsPane`, `BiologySupplementCard` |
| BiomarkersMasterActionPopup (:732-735; BiomarkersMasterActionPopup.tsx) | `BiomarkersMasterActionPopup` |
| AddSupplementDialog (:737-754; AddSupplementDialog.tsx) | `AddSupplementDialog` (submit disabled) |
| HealthReportUploadSheet (:756-761) | health-hub's sheet, remounted per category |

Toasts: the web toasts on these pages fire only from write paths (log-data `enterNumber` / `loggedYourIndexRecomputing` /
`couldNotSave`, report view `noFileAvailable` / `couldNotLoadFile`, supplement create / update / delete) — all
unreachable in the reads-only twin; the supplement read-failure toast (`toasts.hooks.failedLoadSupplements`) comes
from health-hub's `useUserSupplements`.

## Reads only (plan.md "No health data is written to production. Reads only")

- Write-disabled, as health-hub did: log-data submit (`POST /integrations/manual/log`, VitanaLogDataDialog.tsx:92-102),
  report upload (storage + `lab_reports` insert), supplement add / update (useUserSupplements), supplement delete,
  server card dismiss (`POST /enrichment-cards/dismiss`).
- Report cards do not open their file: the web uses `storage.createSignedUrl` (MyBiology.tsx:161-175), a POST the
  network guard (GETs only) does not allow; health-hub's Medical mode made the same call.
- The "Connect" taps delegate to the dark Health Sync entry (`connect()` → `flag_off`); the web's activity-log write
  (useHealthLogger.ts) is not made.
- `useHasBloodPanel`: the web counts with a HEAD request relying on RLS; the native read is a GET for at most one id
  with the explicit `user_id = auth.uid()` filter (same answer).
- `tests/health/vitana-index-biology/consent-no-write.test.tsx` asserts on the built requests: only selects, each
  scoped to `user_id = USER_ID`, no RPC, no storage call, every gateway call a GET with the Bearer token.

## Deviations (documented, small)

- Gradient text / CSS blur glow / backdrop blur are drawn with solid token colours (no gradient-text primitive in the kit).
- The SubNavigation labels are translated (`subNav.*`); the web shows the English `name` because `healthNavigation` has no `i18nKey`.
- F4 "Ask Vitana": the web asks the ORB first (`activateOrb()`); the native app has no ORB activation entry yet, so it
  takes the web fallback `/comm/talk-to-vitana`.
- The empty supplement text says "Tap" instead of "Click" (`healthNative.biology.noSupplementsYet`).
- Mission Alignment shows its loading row until the first answer (also while the session is restored), not "no recommendations".
- Found in health-hub (not edited here): `HealthSyncAffordance` calls `onResult?.(await entry.connect())`, which skips
  `connect()` when no `onResult` is passed; the biology screen passes a no-op `onResult`. `HealthReportUploadSheet`
  keeps its first `defaultCategory`; the biology screen remounts it per category (`key`). Both are follow-ups for the
  health-hub owner.

## Not verified on staging

Device runtime (Maestro, iOS simulator / Android emulator screenshots vs the read-only 390×844 staging pages) is
deferred to G1, `next_actor: owner` (`staging-tests.json` `deferred_g1`, tasks.md task 6).
