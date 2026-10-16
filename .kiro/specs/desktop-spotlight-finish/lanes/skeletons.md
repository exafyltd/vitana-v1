---
lane: skeletons
state: ready
next_actor: kiro
depends_on: []
executor: kiro
seat: exafyltd
area: frontend
reviewer_seat: hotmail
paths:
  - src/components/layout/spotlight/skeletons/**
  - src/components/layout/spotlight/index.ts
  - src/pages/BusinessHub.tsx
  - src/pages/BusinessListings.tsx
  - src/pages/BusinessOpportunities.tsx
  - src/pages/CreatorOnboarded.tsx
  - src/pages/Home.tsx
  - src/pages/IntentBoard.tsx
  - src/pages/IntentMatchDetail.tsx
  - src/pages/Messages.tsx
  - src/pages/MyIntents.tsx
  - src/pages/MyTickets.tsx
  - src/pages/PostDetail.tsx
  - src/pages/assistant/AIAssistant.tsx
  - src/pages/community/EventGamePage.tsx
  - src/pages/community/LiveRoomViewer.tsx
  - src/pages/community/MediaHub.tsx
  - src/pages/discover/Marketplace.tsx
  - src/pages/patient/Dashboard.tsx
  - src/pages/patient/Results.tsx
  - src/pages/settings/Limitations.tsx
  - src/pages/settings/SettingsNotifications.tsx
  - tests/e2e/staging/vtid-*-skeletons.staging.spec.ts
  - scripts/ci/pr-gate/baseline/design.json
  - scripts/ci/pr-gate/baseline/eslint.json
updated: 2026-10-16T09:56Z
---
# Page spinners → archetype skeletons on desktop Spotlight (owner decision 3)
Plan: `.kiro/specs/desktop-spotlight-finish/` — `plan.md` (plan block) and the `tasks.md` section marked `<!-- lane: skeletons -->`
(tasks S1–S4) are authoritative. VTID: assigned by CI after PLAN-SPAR converges; do not start before `vtid:` is set here.

**Measured on `origin/main` 5c4632ea9 (2026-10-16):** 20 files with findings in this lane's paths — `design/no-raw-palette` 119 · `design/no-page-spinner` 23 · `design/no-raw-content-card` 7 · `design/no-arbitrary-size` 11.

**Goal.** Add the shared `SpotlightLoading` component and replace the page spinners in the 20 pages this lane owns. With `useSpotlightEnabled()` true the page shows `ArchetypeSkeleton` (page-level) or `VCardSkeleton` rows (in-section), placed inside the page's own `ScreenFrame` so the frame and header do not move when data arrives. With it false (phones, flag off) the page shows exactly today's spinner, rendered by the same component. Also clears every other `design/*` finding in these files.

**Acceptance (the reviewer seat checks these):**
- `design/*` = 0 in every owned page (no `Loader2`/`animate-spin` outside a button in `src/pages/**`); design + ESLint baselines lowered for these files only.
- Vitest `src/components/layout/spotlight/skeletons/SpotlightLoading.test.tsx`: Spotlight on → `[data-archetype-skeleton]` / row skeletons, no spinner; off → the phone spinner with the page's original classes.
- No layout shift: the skeleton sits inside the same `ScreenFrame` the loaded page renders (staging spec measures CLS < 0.1 on two pages).
- MP4 for the owner: `docs/validation/<VTID>/spinner-vs-skeleton.mp4` (≤ 5 MB), before (main) and after (branch), 1440×900 with `?spotlight=1`, plus 390×844 showing the phone spinner unchanged. Recorded on a local dev build or the PR preview, read-only.
- `npx vitest run`, `npm run build`, `npm run lint` green; PR-GATE design ratchet and **Lane scope** green.
- `docs/validation/<VTID>/` has `scope.json` (every touched path), `staging-tests.json` (this lane's spec) and
  `plan-sparring.md` (copy of the plan's sparring record).

**Shared files.** `scripts/ci/pr-gate/baseline/design.json` and `eslint.json` are the only paths every lane lists
(each lane lowers its own entries; on a merge conflict rebase and regenerate with `gate.mjs baseline-design|baseline-eslint`).

**Never** (collaboration §7a): no VTID allocation, no merge/approve, no workflow dispatch or deploy, no writes to
Supabase/AWS, no test against production; staging specs are read-only. Sidebar/ORB chrome is out of scope (SR-01).

## Log
### 2026-10-16T09:56Z · kiro-202610152203-0347 · created → ready
Lane drafted with the plan (`state: drafted` in `handoff.md`). Paths computed from the ESLint run on 5c4632ea9 so that no
file belongs to two lanes. Next: PLAN-SPAR spars the plan; once a VTID is written here, seat `exafyltd` claims the lane
(`queue.mjs claim desktop-spotlight-finish/skeletons --session <id>`).
