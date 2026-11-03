# Repository Scope

Strict rule: Codex may only work with these GitHub repositories:

- `exafyltd/vitana-v1`
- `exafyltd/vitana-platform`

Codex must ignore every other GitHub repository. Do not inspect, search, clone,
modify, reference, create branches in, open pull requests against, or perform any
action in any repository outside this allowlist unless the user explicitly
changes this rule.

If a task appears to require another repository, stop and ask the user to confirm
that the repository scope rule should be changed before taking any action.

# Autonomous Execution to Verified Staging (owner instruction, 2026-11-03)

The owner asked for end-to-end execution. Work in this repo runs without approval questions until STAGING-VERIFY passes
on the merge commit, or until a stop below applies.

## Read first, every session
1. This file.
2. `CLAUDE.md`: Autonomy Contract, Staging Verification Gate, and the absolute rule against testing or writing to production.
3. `.kiro/steering/vitana-owner-autonomy.md` and `.kiro/steering/vitana-pipeline.md`.
4. `.claude/rules/collaboration.md` §7 to §7c, and the runbooks in `vitana-platform/.kiro/pipeline/` (`driver.md` for Kiro Web).
5. Clone `exafyltd/vitana-platform` next to this repo when a task needs the pipeline scripts (`scripts/collab/`, `.kiro/pipeline/`).

## Default end point
- A change that results in a commit goes through the Vitana pipeline to **STAGING-VERIFY passed on the merge commit**.
- A change that deploys nothing ends when it is merged with green checks.
- Gate 2 (*"Staging verified — ready for deployment to production?"*) is the report at the end. It is the only question about production.

## Do without asking
Investigating, reading code, logs and CI; writing code, tests and docs; running local checks; committing, pushing, opening
and updating PRs; running the reviewer agent; merging under `collaboration.md` §7b; dispatching or re-running staging,
verification and CI workflows; fixing forward up to 3 attempts per lane; writing closing records and removing your own
branches and worktrees. Do not end a reply with an offer or question about a routine next step.

## Stops (the only reasons to ask)
1. A database migration. The owner approves the migration file(s) and target database first (`collaboration.md` §7d). Writing the file in a PR needs no approval.
2. Production: PUBLISH, any `AWS-PROD-*` workflow, or a production deploy. Only the owner's explicit command in the conversation (§7c).
3. A change to a protected gate file (`scripts/collab/protected-gate-files.json`, e.g. `CLAUDE.md`). It needs a reviewer accept on the current head plus an owner instruction that names the plan.
4. A security or data-loss risk.
5. The same failure after 3 fix-forward attempts. Park the lane or plan.
6. An escalated sparring verdict, or work outside the converged plan that one more round does not settle.
7. Verification that would need a write to a live or shared system (production Supabase, gateway, community content).
8. Work in any repository other than `exafyltd/vitana-v1` and `exafyltd/vitana-platform` (see the Repository Scope rule above).
9. A Commerce onboarding change that increases supplier friction, before merge (Commerce supplier screens only).
10. A change to the Spotlight design contract (`.claude/rules/design.md`).
11. The VTID allocator is disabled or failing.
12. Gate 1 for a plan that Claude Code sparred locally. A CI-sparred plan that converges is approved by policy.
13. Turning on product autonomy (`EXECUTION_DISARMED`, `AUTOPILOT_LOOP_ENABLED`, `metadata.autonomous_execution`, or a loop's autonomy level).

When a stop applies, send one message with: what you want to do, why, the evidence, the rule (file and section) that requires the stop, the recommended answer, and the exact decision needed. Finish all other work first.

## Never
- Test against, write to, or deploy to production (`inmkhvwdcuyhnxkgfvsb`, `gateway.vitanaland.com`, any production Cloud Run or AWS service).
- Allocate a VTID by hand. VTIDs come only from CI PLAN-SPAR.
- Merge your own lane or accept your own review. Acceptance comes from the reviewer agent `vitana-lane-reviewer`.
- Skip, disable or loosen a test, force-push, or write to a live system from a session tool.
