---
lane: staging-fix-forward
state: ready
next_actor: kiro
vtid: VTID-05116
executor: kiro
seat: exafyltd
reviewer_seat: claude
paths:
  - tests/e2e/staging/**
  - docs/validation/VTID-05111/**
  - docs/validation/VTID-05116/**
  - docs/validation/VTID-05117/**
branch: kiro/desktop-spotlight/staging-fix-forward
pr: https://github.com/exafyltd/vitana-v1/pull/1440
updated: 2026-10-20T09:35Z
---
# Spotlight staging fix-forward — VTID-05111, VTID-05116, VTID-05117
Fixes the three failing Spotlight staging suites (Tier B flag-off, role/workspace, member/public
leftovers). Test specs under `tests/e2e/staging/` plus their `docs/validation/<VTID>/staging-tests.json`
only — no app source changes. Tasks: `tasks.md` sections for VTID-05111 / VTID-05116 / VTID-05117.

## Log
### 2026-10-20T09:35Z · kiro-202610152203-0347 · created → ready
Landed this lane file on PR #1440's branch so Lane scope (`queue.mjs scope-check`) resolves it: the
PR carries `Collab-Lane: desktop-spotlight/staging-fix-forward` trailers but the lane file did not
exist on main or in vitana-platform, so Lane scope was red (`staging-fix-forward.md not found`). The
declared `paths` cover all six files the PR changes:
`tests/e2e/staging/vtid-05111-tier-b.staging.spec.ts`,
`tests/e2e/staging/vtid-05116-role-workspace.staging.spec.ts`,
`tests/e2e/staging/vtid-05117-member-leftovers.staging.spec.ts`,
`tests/e2e/staging/vtid-05117-public-leftovers.staging.spec.ts`,
`docs/validation/VTID-05116/staging-tests.json`, `docs/validation/VTID-05117/staging-tests.json`.
Lane kept at `ready` (a new lane file must start there). This Kiro session does not merge or approve
(§7a); the Project Manager merges by rule (§7) once review and all required checks are green.
