# VTID-05691 — acceptance (strategy-execution-wave1 / mental-health-label)

Owner, 2026-11-11: *"The app must explicitly identify the fifth pillar as Mental Health, not merely Mental."*
Plan `strategy-execution-wave1` §4.8 and §6 (plan hash `ce6d5013…`), lane `mental-health-label`. Base: vitana-v1
`origin/main` `e31bf4627ff3c705c20f8e6b718ce4dd03353b7f`; follow-up citations in vitana-platform at
`6dc6e1ba0c18252ec2f3fbf5651d245e200f9835`.

## Acceptance criteria
- AC1 — Every pillar-NAME label of the fifth pillar (code key `mental` in an object whose siblings are the other
  pillars) reads "Mental Health" in its language: de "Mentale Gesundheit" (source of truth, set first), en "Mental Health",
  es "Salud mental", fr "Santé mentale", pl "Zdrowie psychiczne", pt "Saúde mental", ru "Психическое здоровье",
  sr (Latin shard) "Mentalno zdravlje", tr "Ruh sağlığı", zh "心理健康", ar "الصحة النفسية"; the `screens.health.mental`
  tab keeps its "🧠 " prefix.
  TEST: `npx vitest run src/i18n/pillar-mental-health-label.test.ts` (red on base: `red-on-base.txt`, 13 failed /
  1 passed; green: `green.txt`, 14 passed).
- AC2 — Keys are unchanged and no other value changes: only the 90 values in the table below differ from base.
  TEST: same Vitest file, test "the pillar-name objects still hold the other pillars as siblings"; the apply script
  deep-diffs every shard before/after and fails on any other changed path (`commands.log` step 3); `git diff -U0` shows
  90 changed lines, all `"mental": …`.
- AC3 — Sentences, plan names and labels that already say mental health are left alone (e.g. `healthNative.plans.planName.mental`
  "Mental Plan" at en:284, `healthNative.plans.aiSummary.mental` en:321, `screens.health.missionAlignment.pillars.mental`
  en:5217, `screens.common.mentalHealth`, `timeline.json`).
  TEST: the Vitest file pins the already-mental-health values (`ALREADY_MENTAL_HEALTH`); `git diff --stat` touches no
  other key.
- AC4 — The deployed build carries the new labels and the Health plans screen shows the fifth pillar tab as Mental Health
  in the account's language, with no horizontal scroll in LTR or RTL at 1400×900 and 390×844.
  TEST: `tests/e2e/staging/mental-health-label.staging.spec.ts` (read-only, run by STAGING-VERIFY via
  `staging-tests.json`; never run from this session). Bundle shape checked locally on a local `vite build`
  (`commands.log` step 6).
- AC5 — `npm test`, `npm run lint`, `npm run i18n:inventory`.
  TEST: `commands.log` steps 4–5. `npm test`: 1 failure, the calendar golden file records the old de `vcal.kinds.mental`
  ("Mentales"); see "Open" below. Lint: 1321 errors / 301 warnings on head and on base (identical, none in this lane's
  files). Inventory output identical with and without this lane, so `docs/SCREEN_INVENTORY.md` is not part of the lane.

## Open (blocks merge)
- `src/components/calendar/__regression__/__golden__/calendar-screen.json:694` records
  `"     18:00 – 19:00 · Mentales"` (de `vcal.kinds.mental`). With this lane it renders
  `"     18:00 – 19:00 · Mentale Gesundheit"`, so `calendar-screen.golden.test.tsx` → "month (6-week grid …)" fails. The file
  is outside the lane's `paths`. Fix: add that golden file to the lane `paths` / scope through `_plan` and re-record with
  `UPDATE_CALENDAR_GOLDEN=1 npm run test:calendar` (the only diff is that one line). The test passes on base with the de
  `vcal.json` change stashed (`commands.log` step 4).

## Keys (pillar-name objects; siblings nutrition / hydration / exercise / sleep confirmed)
| locale | file:line | key | base value | new value |
|---|---|---|---|---|
| de | src/i18n/de/health.json:40 | health.pillars.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/vitanaIndex.json:15 | vitanaIndex.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/newsCard.json:36 | newsCard.pillars.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/healthNative.json:292 | healthNative.plans.pillarName.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/screens.json:861 | screens.common.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/screens.json:3401 | screens.community.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/screens.json:4888 | screens.health.mental | 🧠 Mental | 🧠 Mentale Gesundheit |
| de | src/i18n/de/screens.json:9579 | screens.healthtracker.mental | Mental | Mentale Gesundheit |
| de | src/i18n/de/vcal.json:52 | vcal.kinds.mental | Mentales | Mentale Gesundheit |
| en | src/i18n/en/health.json:42 | health.pillars.mental | Mental | Mental Health |
| en | src/i18n/en/vitanaIndex.json:15 | vitanaIndex.mental | Mental | Mental Health |
| en | src/i18n/en/newsCard.json:38 | newsCard.pillars.mental | Mental | Mental Health |
| en | src/i18n/en/healthNative.json:292 | healthNative.plans.pillarName.mental | Mental | Mental Health |
| en | src/i18n/en/screens.json:861 | screens.common.mental | Mental | Mental Health |
| en | src/i18n/en/screens.json:3401 | screens.community.mental | Mental | Mental Health |
| en | src/i18n/en/screens.json:4888 | screens.health.mental | 🧠 Mental | 🧠 Mental Health |
| en | src/i18n/en/screens.json:9585 | screens.healthtracker.mental | Mental | Mental Health |
| en | src/i18n/en/vcal.json:52 | vcal.kinds.mental | Mental | Mental Health |
| es | src/i18n/es/health.json:42 | health.pillars.mental | Mental | Salud mental |
| es | src/i18n/es/vitanaIndex.json:15 | vitanaIndex.mental | Mental | Salud mental |
| es | src/i18n/es/newsCard.json:38 | newsCard.pillars.mental | Mental | Salud mental |
| es | src/i18n/es/healthNative.json:292 | healthNative.plans.pillarName.mental | Mental | Salud mental |
| es | src/i18n/es/screens.json:853 | screens.common.mental | Mental | Salud mental |
| es | src/i18n/es/screens.json:3379 | screens.community.mental | Mental | Salud mental |
| es | src/i18n/es/screens.json:4802 | screens.health.mental | 🧠 Mental | 🧠 Salud mental |
| es | src/i18n/es/screens.json:9633 | screens.healthtracker.mental | Mental | Salud mental |
| es | src/i18n/es/vcal.json:52 | vcal.kinds.mental | Mente | Salud mental |
| fr | src/i18n/fr/health.json:42 | health.pillars.mental | Mental | Santé mentale |
| fr | src/i18n/fr/vitanaIndex.json:15 | vitanaIndex.mental | Mental | Santé mentale |
| fr | src/i18n/fr/newsCard.json:38 | newsCard.pillars.mental | Mental | Santé mentale |
| fr | src/i18n/fr/healthNative.json:292 | healthNative.plans.pillarName.mental | Mental | Santé mentale |
| fr | src/i18n/fr/screens.json:857 | screens.common.mental | Mental | Santé mentale |
| fr | src/i18n/fr/screens.json:3429 | screens.community.mental | Mental | Santé mentale |
| fr | src/i18n/fr/screens.json:4918 | screens.health.mental | 🧠 Mental | 🧠 Santé mentale |
| fr | src/i18n/fr/screens.json:9745 | screens.healthtracker.mental | Mental | Santé mentale |
| fr | src/i18n/fr/vcal.json:52 | vcal.kinds.mental | Mental | Santé mentale |
| pl | src/i18n/pl/health.json:42 | health.pillars.mental | Samopoczucie | Zdrowie psychiczne |
| pl | src/i18n/pl/vitanaIndex.json:15 | vitanaIndex.mental | Mentalny | Zdrowie psychiczne |
| pl | src/i18n/pl/newsCard.json:38 | newsCard.pillars.mental | Psychika | Zdrowie psychiczne |
| pl | src/i18n/pl/healthNative.json:292 | healthNative.plans.pillarName.mental | Psychika | Zdrowie psychiczne |
| pl | src/i18n/pl/screens.json:857 | screens.common.mental | Mentalne | Zdrowie psychiczne |
| pl | src/i18n/pl/screens.json:3430 | screens.community.mental | Mentalne | Zdrowie psychiczne |
| pl | src/i18n/pl/screens.json:4919 | screens.health.mental | 🧠 Zdrowie psychiczne | unchanged (already names mental health) |
| pl | src/i18n/pl/screens.json:9746 | screens.healthtracker.mental | Mentalne | Zdrowie psychiczne |
| pl | src/i18n/pl/vcal.json:52 | vcal.kinds.mental | Umysł | Zdrowie psychiczne |
| pt | src/i18n/pt/health.json:42 | health.pillars.mental | Mental | Saúde mental |
| pt | src/i18n/pt/vitanaIndex.json:15 | vitanaIndex.mental | Mental | Saúde mental |
| pt | src/i18n/pt/newsCard.json:38 | newsCard.pillars.mental | Mental | Saúde mental |
| pt | src/i18n/pt/healthNative.json:292 | healthNative.plans.pillarName.mental | Mental | Saúde mental |
| pt | src/i18n/pt/screens.json:857 | screens.common.mental | Mental | Saúde mental |
| pt | src/i18n/pt/screens.json:3405 | screens.community.mental | Mental | Saúde mental |
| pt | src/i18n/pt/screens.json:4894 | screens.health.mental | 🧠 Mental | 🧠 Saúde mental |
| pt | src/i18n/pt/screens.json:9635 | screens.healthtracker.mental | Mental | Saúde mental |
| pt | src/i18n/pt/vcal.json:52 | vcal.kinds.mental | Mente | Saúde mental |
| ru | src/i18n/ru/health.json:40 | health.pillars.mental | Ментальное | Психическое здоровье |
| ru | src/i18n/ru/vitanaIndex.json:15 | vitanaIndex.mental | Ментальное | Психическое здоровье |
| ru | src/i18n/ru/newsCard.json:38 | newsCard.pillars.mental | Ментальное здоровье | unchanged (already names mental health) |
| ru | src/i18n/ru/healthNative.json:292 | healthNative.plans.pillarName.mental | Психика | Психическое здоровье |
| ru | src/i18n/ru/screens.json:857 | screens.common.mental | Ментальное | Психическое здоровье |
| ru | src/i18n/ru/screens.json:3432 | screens.community.mental | Ментальное | Психическое здоровье |
| ru | src/i18n/ru/screens.json:4921 | screens.health.mental | 🧠 Ментальное здоровье | unchanged (already names mental health) |
| ru | src/i18n/ru/screens.json:9745 | screens.healthtracker.mental | Ментальное | Психическое здоровье |
| ru | src/i18n/ru/vcal.json:52 | vcal.kinds.mental | Психика | Психическое здоровье |
| sr | src/i18n/sr/health.json:40 | health.pillars.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/vitanaIndex.json:15 | vitanaIndex.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/newsCard.json:38 | newsCard.pillars.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/healthNative.json:292 | healthNative.plans.pillarName.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/screens.json:853 | screens.common.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/screens.json:3407 | screens.community.mental | Mentalno zdravlje | unchanged (already names mental health) |
| sr | src/i18n/sr/screens.json:4830 | screens.health.mental | 🧠 Mentalno | 🧠 Mentalno zdravlje |
| sr | src/i18n/sr/screens.json:9678 | screens.healthtracker.mental | Mentalno | Mentalno zdravlje |
| sr | src/i18n/sr/vcal.json:52 | vcal.kinds.mental | Mentalno | Mentalno zdravlje |
| tr | src/i18n/tr/health.json:45 | health.pillars.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/vitanaIndex.json:17 | vitanaIndex.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/newsCard.json:39 | newsCard.pillars.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/healthNative.json:292 | healthNative.plans.pillarName.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/screens.json:857 | screens.common.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/screens.json:3431 | screens.community.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/screens.json:4918 | screens.health.mental | 🧠 Zihinsel | 🧠 Ruh sağlığı |
| tr | src/i18n/tr/screens.json:9742 | screens.healthtracker.mental | Zihinsel | Ruh sağlığı |
| tr | src/i18n/tr/vcal.json:52 | vcal.kinds.mental | Zihin | Ruh sağlığı |
| zh | src/i18n/zh/health.json:40 | health.pillars.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/vitanaIndex.json:15 | vitanaIndex.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/newsCard.json:38 | newsCard.pillars.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/healthNative.json:292 | healthNative.plans.pillarName.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/screens.json:857 | screens.common.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/screens.json:3431 | screens.community.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/screens.json:4918 | screens.health.mental | 🧠 心理 | 🧠 心理健康 |
| zh | src/i18n/zh/screens.json:9742 | screens.healthtracker.mental | 心理 | 心理健康 |
| zh | src/i18n/zh/vcal.json:52 | vcal.kinds.mental | 心理 | 心理健康 |
| ar | src/i18n/ar/health.json:42 | health.pillars.mental | نفسي | الصحة النفسية |
| ar | src/i18n/ar/vitanaIndex.json:15 | vitanaIndex.mental | الصحة العقلية | unchanged (already names mental health) |
| ar | src/i18n/ar/newsCard.json:38 | newsCard.pillars.mental | نفسي | الصحة النفسية |
| ar | src/i18n/ar/healthNative.json:292 | healthNative.plans.pillarName.mental | الصحة النفسية | unchanged (already names mental health) |
| ar | src/i18n/ar/screens.json:857 | screens.common.mental | الصحة العقلية | unchanged (already names mental health) |
| ar | src/i18n/ar/screens.json:3431 | screens.community.mental | ذهني | الصحة النفسية |
| ar | src/i18n/ar/screens.json:4918 | screens.health.mental | 🧠 العقلية | 🧠 الصحة النفسية |
| ar | src/i18n/ar/screens.json:9742 | screens.healthtracker.mental | الصحة النفسية | unchanged (already names mental health) |
| ar | src/i18n/ar/vcal.json:52 | vcal.kinds.mental | الصحة النفسية | unchanged (already names mental health) |

Decisions taken
- ru `newsCard.pillars.mental` ("Ментальное здоровье") and `screens.health.mental` ("🧠 Ментальное здоровье"), and ar
  `vitanaIndex.mental` / `screens.common.mental` ("الصحة العقلية") already name mental health; left unchanged under the
  lane rule "skip keys that already say mental health". Each locale therefore uses two synonymous phrasings; unifying
  them is a wording choice for a later i18n review, not this lane.
- es/fr/pt use sentence case ("Salud mental", "Santé mentale", "Saúde mental"), matching the same pillar in each
  locale's `timeline.json` and the lane's instruction; `screens.health.missionAlignment.pillars.mental` in es/pt is
  title case ("Salud Mental", "Saúde Mental") and is not touched.
- sr shard is Latin script → "Mentalno zdravlje".
- scope.json has no `change_class`: PR-GATE `validateScope` (scripts/ci/pr-gate/lib.mjs:81-83) rejects any value other
  than `frontend-simple`; a standard (sparred) change omits the field and names its `sparring_record`.

## Proposed follow-ups (other surfaces still naming the fifth pillar "mental" without "health"; not changed here)
vitana-platform (`6dc6e1ba0c`):
- `services/gateway/src/lib/vitana-pillars.ts:29-32` `pillarLabel()` returns the bare key `mental`; no call sites
  (`grep -rn "pillarLabel(" services` finds only the definition). Change it to "mental health" or remove it. Risk low.
- `services/gateway/src/services/assistant-continuation/providers/login-briefing.ts:264-280` `pillarLabelLocalized()`
  (en `mental`, de `mentale Stärke`), used at `:292` and `:868` in briefing text. Risk medium (spoken/shown wording; NEVER 41
  applies to speech).
- `services/gateway/src/services/assistant-continuation/providers/next-action/sources/life-compass-alignment.ts:160-166`
  German pillar map `mental: 'Mental'` used in a user-facing sentence.
- `services/gateway/src/services/voice-tools/community-member-ranker.ts:836-837` composes "the ${pillarLabel} pillar" from
  its caller's label.
- `services/gateway/src/services/guide/initiative-registry.ts:37,135,212,362` and `services/gateway/src/services/guide/tip-curriculum.ts:27,235,257,281,452`
  use `'Mental'` as the pillar link value; check whether it is shown to members.
vitana-v1 (`e31bf4627`), hard-coded English pillar maps in code (also i18n rule violations; present in the built entry bundle):
- `src/components/health/PillarDeltaBadges.tsx:11`, `src/lib/celebrate.ts:53`, `src/components/health/VitanaLogDataDialog.tsx:58`,
  `src/components/health/VitanaPillarAgentsPanel.tsx:28`, `src/components/health/CrossPlanRelationshipWidget.tsx:29`,
  `src/components/health/VitanaScoreTooltip.tsx:20`, `src/lib/diary-index-sync.ts:83`, `src/lib/news-images.ts:233,240-241,265`
  (type / category values), `src/pages/Community.tsx:86,180,214,235,265` (sample data).
- `apps/mobile`: pillar labels come from the shared web shards (`apps/mobile/src/i18n/index.ts:5`), so this lane's change
  reaches native too; no hard-coded "Mental" pillar label found (`grep -rn "'Mental'" apps/mobile/src` → only
  `apps/mobile/src/screens/journey/tiles.tsx:274`, an event-type comparison, not a label).
