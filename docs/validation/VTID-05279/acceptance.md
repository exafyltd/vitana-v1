# VTID-05279 — acceptance (claude-md-cleanup / rules-trim-v1)
Docs only; deploys nothing (no `staging-tests.json`, no STAGING-VERIFY, no Gate 2; plan Decision 9). Acceptance
from `exafyltd/vitana-platform` `.kiro/specs/claude-md-cleanup/tasks.md` lane `rules-trim-v1`. Commands run from the
vitana-v1 repo root; results in `commands.log`.

AC-1: v1 `CLAUDE.md` is roughly 450–480 lines (from 574).
TEST: grep -c '' CLAUDE.md  # => 471

AC-2: every VERIFICATION token present in the lane files on `origin/main` is still present, plus `20260805160000`,
and every v1 keep-list section is still there.
TEST: grep -c '^RESULT: PASS' docs/validation/VTID-05279/outputs/must-keep-check.txt  # => 1

AC-3: change K — the codebase-intelligence section is recommended, not mandatory; the tool list is kept.
TEST: grep -c -E 'Mandatory Codebase Intelligence|must be current|Do not begin implementation' CLAUDE.md  # => 0
TEST: grep -c 'Codebase intelligence — RepoWise and Graphify (recommended)' CLAUDE.md  # => 1
TEST: grep -o -E 'get_overview|search_codebase|get_context|get_symbol|get_why|get_risk|graphify query|graphify path|graphify explain|graphify update \.' CLAUDE.md | sort -u | wc -l  # => 10

AC-4: "Why no host is exempt" is the rule plus one "why" clause and keeps the migration guards and the
`notification_test_actors` registration.
TEST: grep -o -E '20260805160000|_notif_is_test_actor\(\)|Register any new test account in' CLAUDE.md | wc -l  # => 3
TEST: grep -c -E '14:54 and 15:00 UTC|community-app-pr-123|This section exists for the follow-up' CLAUDE.md  # => 0

AC-5: the Collaboration roles paragraph agrees with `collaboration.md` §3a/§7–§7b (reviewer agent, CI VTIDs,
§7b merges, Claude optional, protected gate files need owner/legacy Claude review).
TEST: grep -c "one Kiro account reviews another's lane" CLAUDE.md  # => 0
TEST: grep -c -E 'vitana-lane-reviewer|converged-auto-v1|never merges on a reviewer-agent accept alone' CLAUDE.md  # => 3

AC-6: steering role lines point at `collaboration.md` §7–§7b; no stale line count; session-start steps once; "never
test against production" kept.
TEST: grep -c 'about 1,000 lines' .kiro/steering/vitana-kiro-notes.md .kiro/steering/vitana-load-project-rules.md  # => 0 for each file
TEST: grep -l 'queue.mjs session-id' .kiro/steering/*.md  # => .kiro/steering/vitana-load-project-rules.md
TEST: grep -c 'Never test against production' .kiro/steering/vitana-load-project-rules.md  # => 1

AC-7: the diff touches only the lane paths and `.claude/CLAUDE.md` is unchanged.
TEST: git diff --name-only origin/main...HEAD | grep -v -E '^(CLAUDE\.md|\.kiro/steering/vitana-(kiro-notes|load-project-rules)\.md|docs/validation/VTID-05279/.*)$' | wc -l  # => 0

AC-8: the Kiro steering guard and the PR-GATE scope / sparring checks pass for this PR.
TEST: node scripts/ci/kiro-steering/guard.cjs .  # => exit 0
TEST: PR_TITLE='VTID-05279 (claude-md-cleanup/rules-trim-v1): x' node scripts/ci/pr-gate/gate.mjs scope --base origin/main --head HEAD  # => ✅ scope
