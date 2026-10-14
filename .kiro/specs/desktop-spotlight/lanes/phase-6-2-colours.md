---
lane: phase-6-2-colours
state: in-review
next_actor: claude
vtid: VTID-05112
depends_on: []
claimed_by: kiro-202610141113-9826
branch: kiro/desktop-spotlight/phase-6-2-colours
pr: https://github.com/exafyltd/vitana-v1/pull/1411
updated: 2026-10-14T11:40Z
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

### 2026-10-14T11:40Z · kiro-202610141113-9826 · ready → in-review (batch 1) + split request

Claimed the lane and implemented **batch 1** of 6.2 colours → PR #1411
(`kiro/desktop-spotlight/phase-6-2-colours`). Reviewer: Claude Code.

**What I measured first.** On `main`, `design/no-raw-palette` has ~3,325 flagged lines across **471** non-chrome
files, i.e. ~1,285 distinct raw tokens incl. opacity suffixes, arbitrary hex (`text-[#1B8FC7]`), gradient stops and
`style={{…}}` colour literals. The §E table maps the *status / muted / surface / border* families and `bg-white`
unambiguously, but it does **not** mechanically decide the large remainder: category/chart colours (→ which of
`category-1..8`?), `text-white`/`text-white/NN` on dark surfaces, `bg-black/NN` overlays, page gradients
(`from-purple-50 via-blue-50 to-pink-50`), brand gradients and arbitrary hex. Those are per-usage visual judgements,
not a blind codemod.

**Batch 1 (this PR).** The **60 files whose *every* raw-palette violation is covered by the unambiguous §E mapping**
— so each reaches `design/no-raw-palette = 0`. 119 surgical replacements driven by the exact ESLint findings
(file+line+token); nothing outside a flagged className touched. Verified: 0 raw-palette in all 60 files; no file worse
on any other rule; design+eslint baselines lowered for the 60 files only (every other entry byte-identical);
scope.json extended; Vitest 3411/3411; `npm run build` green; `gate.mjs ratchet-design` green vs base.

**Pre-existing drift (flagged, not mine).** `ratchet-eslint` flags `src/lib/firebase-messaging-sw.chat-tag.vtid-05137.test.ts`
0→4 (`no-explicit-any`). Not in this PR; lints to 4 on clean `origin/main`; no entry in the committed baseline on main.
Repo-wide stale-baseline drift that predates this branch — a separate baseline-refresh decision, out of scope here.

**Split request — needs the coordinator (`_plan`).** The remaining **~411 files / ~3,200 violations** cannot land as
one clean PR and need per-usage judgement. I cannot allocate VTIDs, edit `handoff.md` or create lanes (§7a). Please,
as coordinator, decide the split — suggested cut, each its own lane for Kiro:
  1. **category/chart colours → `category-1..8`** (needs a per-component colour-role decision; biggest judgement set);
  2. **white/black on dark surfaces + overlays** (`text-white*`, `bg-black/NN`, `border-white/NN`);
  3. **page & brand gradients** (`from/via/to-*`, incl. the §E page-gradient and Vitana-index-ring rows);
  4. **arbitrary hex / `style` colour literals** (`text-[#…]`, `style={{ color: '#…' }}` → `hsl(var(--token))`);
  5. a final **sweep** for whatever single-token stragglers remain, then flip "System-wide done".
Next: Claude Code reviews PR #1411 against the acceptance list and merges, then allocates the split lanes above.
