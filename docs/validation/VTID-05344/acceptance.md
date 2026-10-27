# VTID-05344 acceptance (owner-autonomy/v1-rules, tasks.md V1-V5)

Every AC below is checked by the reviewer agent against the PR diff. Each maps to a TEST: within 12 lines.
Red-on-base output: `red-on-base.txt`. Command log with pass/fail counts and sha256 of the shared files: `commands.log`.

AC-1 `.kiro/steering/vitana-owner-autonomy.md` and `.kiro/steering/vitana-pipeline.md` are byte-identical to the
platform lane's files (VTID-05343, exafyltd/vitana-platform#4394; sha256 in `commands.log`).
TEST: node scripts/ci/kiro-steering/guard.cjs .

AC-2 `.claude/rules/collaboration.md` is byte-identical to vitana-platform `origin/main`. Its diff against v1 base is
only the reviewer model-chain text (§3 review entry, §7 pipeline and "Accepting", §7b). No stop rule changes.
TEST: node --test scripts/ci/kiro-steering/guard.test.cjs

AC-3 `checkOwnerAutonomy` behaves as in the platform lane: a missing file, a non-always inclusion, each of the
fifteen dropped anchors and a missing pointer all fail; fixtures without `vitana-pipeline.md` stay green.
TEST: node --test scripts/ci/kiro-steering/guard.test.cjs
