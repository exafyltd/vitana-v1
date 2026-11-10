# VTID-05623 — plan sparring record

Verdict: CONVERGED (2 rounds, standard change class). Round 1: one major (CLAUDE.md rule text missing from scope), accepted and fixed. Round 2: no blocker or major.
Plan hash: sha256:74a5d96df9f536ba889b2622068ebdf805888e50424bba1f96395ebcdb1d5288 (SHA-256 of the text between the plan markers; computed locally).
Approval: owner approval given 2026-11-08 ("Yes" to Gate 1).

# Plan: allow read-only staging specs in the frontend-simple class

Change class: standard (changes the class definition, so the rules require sparring).

<!-- plan:begin -->
## Intent
A simple front-end change needs a staging check ("no suite, no merge"). The frontend-simple class currently allows only src/** and public/**, so a change with a staging spec does not qualify and falls back to full sparring. This makes the class unusable for nearly every simple UI change.

## Change
1. scripts/ci/pr-gate/lib.mjs: add FRONTEND_SIMPLE_ALLOW entry `tests/e2e/staging/*.staging.spec.ts` (only top-level staging specs; no other tests/ paths).
2. scripts/ci/pr-gate/__tests__/frontend-simple.test.mjs: a staging spec diff qualifies; a non-staging test file under tests/ does not; a staging spec under a subfolder does not.
3. Deny list unchanged. Staging specs are read-only by construction: the platform guard (scripts/ci/staging-verify/staging-guard.ts) aborts every non-read request (methods other than GET/HEAD/OPTIONS) to guarded hosts except sign-in; fire-and-forget telemetry and presence writes are aborted but tolerated. The runner rejects specs without the guard import and copies a fresh guard on every run.
4. vitana-v1 CLAUDE.md rule text (Plan Sparring Gate, item 2): the diff may be inside src/**, public/**, or tests/e2e/staging/*.staging.spec.ts.
5. vitana-platform CLAUDE.md rule 51a: the same wording.
The hook needs no change (it matches the class name only).

## Test plan
- node --test scripts/ci/pr-gate/__tests__/*.test.mjs (pass).
- A diff with src/** plus tests/e2e/staging/x.staging.spec.ts passes frontendSimpleViolations; a diff with tests/unit/x.ts fails it.

## Risks to examine
- A staging spec could be used to smuggle a write. Is the guard the real control, and is it in the same PR gate?
- The glob is top-level only. Does globToRegExp treat '*' as one segment, so subfolders are excluded?
- Does this change the meaning of frontend-simple for existing merged work?
## Planner responses (round 1)
- F1 (major, rule text not in scope): ACCEPTED. Steps 4 and 5 added; CLAUDE.md:211-212 requires them with the class change.
- F2 (minor, fixtures not matched): DECIDED, conservative. tests/e2e/staging/fixtures/** stays out of the class. A change that adds a fixture needs sparring. This is stated here rather than left implicit.
- F3 (minor, guard description): ACCEPTED. Wording in step 3 corrected to the guard's real behaviour.

## Revised scope
Files: scripts/ci/pr-gate/lib.mjs; scripts/ci/pr-gate/__tests__/frontend-simple.test.mjs; vitana-v1 CLAUDE.md; vitana-platform CLAUDE.md.
<!-- plan:end -->

