# Lane brief — VTID-05457 · native-wave2-health-biology-r3/vitana-index-biology

> Working summary. The authoritative spec is in `exafyltd/vitana-platform` on the plan branch
> `kiro/native-wave2-health-biology-r3/plan`: `.kiro/specs/native-wave2-health-biology-r3/` — `plan.md`, `tasks.md`
> (`<!-- lane: vitana-index-biology -->`, tasks 1–7), `lanes/vitana-index-biology.md`. (This spec has no
> `requirements.md` / `design.md`.) If this file conflicts with the spec, the spec wins.

- **Lane / VTID:** `native-wave2-health-biology-r3/vitana-index-biology`, VTID-05457 (CI, converged-auto-v1).
- **Seat:** exafyltd → reviewer_seat hotmail. Session `kiro-exafyltd-202611011658-9f52`.
- **depends_on:** `health-hub` (VTID-05455, PR #1562, accepted, not merged). Branch
  `kiro/native-wave2-health-biology-r3/vitana-index-biology` is based on
  `origin/kiro/native-wave2-health-biology-r3/health-hub` (cda3e39f0); the PR targets `main` and lands after #1562.
- **Scope (4 ledger rows):** `HEALTH.VITANA_INDEX /health/vitana-index`, `HEALTH.MY_BIOLOGY /health/my-biology`,
  `HEALTH.BIOLOGY_OMICS ?tab=omics`, `HEALTH.BIOLOGY_SUPPLEMENTS ?tab=supplements`.
- **Web sources:** `src/pages/health/VitanaIndexDetail.tsx` (route `src/App.tsx:1162`), `src/pages/health/MyBiology.tsx`
  (route `src/App.tsx:1152`) — phone branches only (plan decision 6).
- **Rules:** reads only (plan.md "No health data is written to production. Reads only"); write actions presented
  but disabled, as health-hub did; Index data from health-hub's native module, never re-fetched; class-B hooks not
  moved to core; no OS permission / ingest (Health Sync via health-hub's affordance); i18n DE-first, 11 locales;
  every route reachable on a cold start; device runtime deferred to G1 (`next_actor: owner`).
- **Do not edit** health-hub's files (HealthUtilityBar, ports/health-sync.ts, ports/health-data.ts, VitanaIndexSheet,
  the data module, sheets) — import and reuse them.
