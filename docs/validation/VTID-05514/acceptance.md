# VTID-05514 — Acceptance (v1: superseded PR runs cancel per PR)

Scope of this PR: the per-PR concurrency block on the six v1 PR-triggered workflows declared by the lane, and nothing else.
PR-GATE.yml is not changed.

AC-1 — Each of the six workflows has the block once, with cancel-in-progress set only by pull_request events
  Verified by: commands.log (six blocks, zero deletions).
AC-2 — Push-to-main and scheduled runs are never cancelled by the block
  Verified by: cancel-in-progress is ${{ github.event_name == 'pull_request' }} (commands.log).
AC-3 — Required check names are unchanged
  Verified by: the diff adds only the six-line block (commands.log).
