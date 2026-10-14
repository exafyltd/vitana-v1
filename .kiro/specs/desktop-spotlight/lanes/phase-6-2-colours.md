---
lane: phase-6-2-colours
state: ready
next_actor: kiro
vtid: VTID-05112
depends_on: []
updated: 2026-10-14T11:00Z
---
# Card consolidation 6.2 — raw palette → tokens (option A) — VTID-05112

Tasks: `tasks.md` section for VTID-05112, item 6.2, and the owner decision recorded there (2026-10-14, option A).

**Goal:** `design/no-raw-palette` = 0 in `scripts/ci/pr-gate/baseline/design.json` for every non-chrome file, by replacing each raw
palette colour with the nearest existing token per `docs/design-system/SPOTLIGHT_RULES.md` §E. No new tokens, no edits
to `src/index.css` or `tailwind.config.ts`, no sidebar/ORB chrome.

**Acceptance (the reviewer checks these):**
- `design/no-raw-palette` errors 0 across `src/**` **except the sidebar/ORB chrome**, which this lane never touches
  (SR-01) and which keeps its baseline entries: `src/components/AppLayout.tsx`, `src/components/dev/DevSidebar.tsx`,
  `src/components/vitanaland/OrbDiscoveryHint.tsx`, and any other file that renders the sidebar or the ORB (list
  them in the PR body). Design + ESLint baselines lowered for every touched file; no file worse on any other rule
  (PR-GATE design ratchet green).
- Vitest green; `npm run build` green; lint green.
- Light and dark mode both use tokens (no `dark:` palette pairs left); RTL untouched.
- `docs/validation/VTID-05112/scope.json` covers every touched path.
- PR body lists the colour shifts by category (status / category / surface / text) for the Gate 2 staging review.
- Split into several PRs only if you must; if so, say so in this log and ask the coordinator for extra lanes.

Owner gates still apply: staging verification, then Gate 2 before production. Kiro opens the PR and stops (§7a).

## Log
### 2026-10-14T11:00Z · session_01VfFmxfKqidAuisVgjFsiC6 · created → ready
Created by the coordinator after the owner chose option A for 6.2. No dependencies: phase 5 (VTID-05111, #1374) is
merged on `main`, so this lane is not blocked even though the stale `phase-5` lane file still says `ready`.
