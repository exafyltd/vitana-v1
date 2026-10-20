---
inclusion: always
---
# Working in Kiro on Vitana (VTID-05059)

- Kiro IDE has no Claude Code skills, hooks or subagents. The rules still apply unchanged:
  - **Plan sparring is never skipped.** Every plan is a `plan(<slug>)` PR; CI `PLAN-SPAR.yml` spars it (partner chain
    unchanged). Answer each round in `sparring/responses-<n>.md`. No VTID before convergence; CI allocates it.
  - The Claude Code PreToolUse sparring reminder and the SessionStart morning-pack hook do not run here. To load
    where a piece of work stands, run `scripts/dev/resume-vtid.sh <VTID>` from the vitana-platform checkout and paste its output into the chat.
- `CLAUDE.md` is always included, as in a Claude Code session. Path-scoped references (`.claude/rules/*.md`) load
  only when you work on matching files.
- **Your role:** `.claude/rules/collaboration.md` §7–§7b is the single source of truth. Kiro plans, builds and reviews
  and runs the pipeline end to end (plan → CI sparring → CI VTID → build → reviewer agent → merge under §7b → staging
  → STAGING-VERIFY → Gate 2); Claude Code is optional and handles exceptions (§7 Claude-unavailable mode). What you
  never do: §7a (never allocate a VTID by hand — CI does; never deploy to production; never write to a live system
  from session tools; never accept your own lane). The entry point for every owner task is
  `.kiro/steering/vitana-pipeline.md`; the session-start steps are item 4 of `vitana-load-project-rules.md`.
