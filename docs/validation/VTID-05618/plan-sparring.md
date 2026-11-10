# VTID-05618 — plan sparring record (retroactive)

Verdict: CONVERGED (3 rounds, standard change class; round 3 verdict: converged, no open blocker or major).
Plan hash: sha256:b704e78ba77893b48252f244828fd638ea05c96328b4bd772edf415d52763e42 (SHA-256 of the text between the plan markers; computed locally, not by the gateway canonical-hash service).
Approval: owner approval given 2026-11-08 in the Claude Code session ("Yes approved") after the converged verdict (Gate 1).
Sparring was run locally with the plan-sparring-partner agent; there is no plan_sparring_sessions row, so this file is the sparring evidence.

# Plan: simple front-end changes need a VTID, not sparring (retroactive sparring record)

Change class: standard (touches PR-gate scripts, a PreToolUse hook, governance rule text).
Already merged: vitana-v1 #1622 (squash 03115ae), vitana-platform #4866 (squash 9e6fed6). Owner waived the reviewer accept on protected gate files; owner instructed this record.

<!-- plan:begin -->
## Intent
Owner decision 2026-11-07: sparring is for back-end and complex work. A simple front-end change needs a VTID from the ledger but no sparring session.

## Changes
1. vitana-v1 scripts/ci/pr-gate/lib.mjs: class `frontend-simple` (constant FRONTEND_SIMPLE). Allowed: src/**, public/**. Denied: src/App.tsx, src/navigation/**, src/design/**, src/integrations/**, src/routes/guards/**, auth contexts, src/generated/**. Max 15 non-doc files. frontendSimpleViolations(changed, botOnly). validateScope accepts change_class only as frontend-simple.
2. vitana-v1 scripts/ci/pr-gate/gate.mjs sparring(): a scope declaring frontend-simple passes without a sparring record only when the diff verifies; otherwise the record is required.
3. vitana-v1 scripts/ci/pr-gate/vtid-scope.mjs: init accepts --change-class.
4. vitana-v1 .claude/hooks/pretooluse-plan-sparring-reminder.sh: an allocation payload referencing frontend-simple is not denied.
5. Rule text: vitana-v1 CLAUDE.md (Plan Sparring Gate section), vitana-platform CLAUDE.md (rules 2b, 51, new 51a, 4.1), both plan-sparring SKILL.md, vitana-v1 .claude/rules/collaboration.md (one line).
6. Tests: scripts/ci/pr-gate/__tests__/frontend-simple.test.mjs (5 tests); whole pr-gate suite 32/32.

## Not in this change (known gap)
The database gate `_plan_sparring_gate_eval` (vitana-platform migration 20261015180000) does not accept change_class frontend-simple. A front-end VTID is refused in enforce mode until a separate back-end plan ships. This change does not touch the database.

## Test plan
- node --test scripts/ci/pr-gate/__tests__/*.test.mjs (32 pass).
- Hook: an allocation payload with change_class frontend-simple passes; one without a reference is denied.
- Vitest on origin/main: 495 files, 3976 tests pass.

## Risks to examine
- The frontend-simple allowlist can be widened by editing lib.mjs in a PR that is itself sparred? Is that circular?
- The PR gate evaluates scope only when a VTID is in the title; a PR with no VTID skips the sparring check entirely.
- Deny list completeness (e.g. src/contexts non-auth files, src/lib/supabase).
- Does a change-class claim in scope.json require a PR-gate rerun on each push?
- Retroactive record: the change merged without a VTID; does the record need to say so?
<!-- plan:end -->

## Planner responses (round 1)

- F1 (major, CLAUDE.md overstates trigger coverage): ACCEPTED. The sentence "the vtid_ledger trigger checks sparred plans" needs "and does not yet accept the frontend-simple class". Planned follow-up: correct that sentence in vitana-v1 CLAUDE.md (protected file, needs its own owner-approved change). Not done in this record.
- F2 (major, shadow-log noise): ACCEPTED as characterisation. Verified: in log mode each frontend-simple allocation is written with outcome 'missing' to plan_sparring_shadow_log (migration 20261004110000 writes the row). Verified also: no code reads that table's outcomes (the reconciler does not reference it; only a repository comment and the domain atlas list it). So it is log noise, not an alert. The follow-up back-end change adds a change_class branch to _plan_sparring_gate_eval so these rows become 'ok'.
- F3 (minor, change_class name collision): ACCEPTED. Two unrelated uses: plan_sparring_sessions.change_class (light|standard|expedited) and scope.json change_class (frontend-simple). Different storage, no runtime conflict. Recorded here so a reader does not conflate them.
- F4 (minor, deny list omits src/context/**): ACCEPTED as an oversight, not a product decision. src/context/ holds ProfileProvider, CallContext, OfflineProvider, StreamingStateContext, GuidedModeProvider and IntelligentGreetingProvider. Planned follow-up: deny src/context/** (conservative). The merged deny list covers only the auth providers, so the merged code is looser than intended until that follow-up ships.
- F5 (minor, self-identified circularity): ANSWERED. lib.mjs is outside src/** and public/**, so any edit to it cannot qualify as frontend-simple and needs sparring. The class definition is protected by construction.

Questions:
1. Reconciler: no code reads plan_sparring_shadow_log outcomes (see F2).
2. Context providers: oversight, see F4.
3. Database gap: a separate back-end VTID and its own plan. It is not an addendum to this record.

## Planner responses (round 2)
- F6 (major, reconciler flags frontend-simple as tamper): ACCEPTED, verified. reconciler.ts:108-132 lists every vtid_ledger row whose metadata has no sparring_exempt_reason as 'bare' and emits ledger_rows_without_sparring; a frontend-simple row has neither, so it is flagged. The reconciler is off unless PLAN_SPARRING_RECONCILER_ENABLED=true (index.ts:2184-2190, reconciler.ts:56). Latent, not active.
- F2 disposition: amended. The shadow-log note stands (nothing reads it), and F6 is the second, independent path the earlier check missed.

## Database follow-up scope (corrected, names both gaps)
The back-end follow-up plan MUST close both:
  (a) _plan_sparring_gate_eval (migration 20261015180000): a change_class = frontend-simple branch so these allocations are outcome 'ok';
  (b) services/gateway/src/services/plan-sparring/reconciler.ts check 2: exclude rows whose metadata change_class is frontend-simple from the 'bare' bucket (and from ledger_rows_without_sparring).
Until both ship, frontend VTIDs are refused in enforce mode and would be flagged by the reconciler if it were enabled. Neither is active today (log mode; reconciler off).

## Revised plan scope (round 2)
This record covers the merged state only. The follow-ups below are NOT part of it and each needs its own plan:
- F1: CLAUDE.md sentence correction (protected file).
- F2/database: add frontend-simple to _plan_sparring_gate_eval (back-end, own sparring).
- F4: deny src/context/** in lib.mjs (sparred because it changes the class definition).


