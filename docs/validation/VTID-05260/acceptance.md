# VTID-05260 — vitana-v1 mirror of the owner-named governance lane rules

Companion of exafyltd/vitana-platform#4214 (lane `collab-kiro-governance/owner-governance`). The code
(`scripts/collab/queue.mjs`, `queue.test.mjs`) and the full evidence pack live in vitana-platform
(`docs/validation/VTID-05260/`). This PR only keeps the rule files identical in both repos.

## Acceptance criteria

AC-1: `.claude/rules/collaboration.md` is byte-identical to vitana-platform's. It carries the §7b owner-named governance lane rule, and also the §7b owner merge/deploy exception (owner decision 2026-10-18), which so far existed only in vitana-platform.
  TEST: cmp against vitana-platform (exafyltd/vitana-platform#4214, docs/validation/VTID-05260/outputs/pair-identity.txt)
AC-2: `.kiro/steering/vitana-kiro-notes.md` is byte-identical to vitana-platform's, and the collaboration section of `CLAUDE.md` is identical to vitana-platform's.
  TEST: cmp / diff against vitana-platform (same output file); node scripts/ci/kiro-steering/guard.cjs . → OK

## Known red check (bootstrap, plan A.5)
Lane scope reads the lane file from vitana-platform `main`. That file has no `governance: owner` yet: the field becomes
valid only with Change A, and the lane cannot grant it to itself. So the check refuses the 3 governance files here, which
is the same known false positive as on #4214.
