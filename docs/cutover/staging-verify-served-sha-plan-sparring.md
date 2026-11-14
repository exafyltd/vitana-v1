# Plan sparring record: STAGING-VERIFY per-landing verify checks the served commit

Verdict: **CONVERGED** (round 2, 2026-11-14). Plan hash (sha256 of the text between the plan markers):
`9c9de43c55ac02de64449d788dd0a023bf580eadf65e1f79dc1263efd34d4050`.

Change class: standard. Round cap: 3. Rounds used: 2.
VTID: **not yet allocated.** VTIDs come only from CI PLAN-SPAR. Implementation is blocked on owner
confirmation of access to GitLab `vitana/ci-config` (finding F4, acknowledged, not closed).

## Rounds
- Round 1 (partner findings): F1 major (artifacts unverifiable from the GitHub repos), F2 major (guard as scope
  creep), F3 major (production STAGING-VERIFY path unaddressed), F4 major (target repo outside the allowlist),
  F5 minor (directional wording), F6 minor (pipeline-gen and linter unconfirmed), F7 minor (negative test
  underspecified).
- Planner responses: F1, F2, F3, F5, F7 accepted and the plan revised; F4 deferred to the owner; F6 deferred to
  implementation.
- Round 2 (partner dispositions): F1, F2, F3, F5, F7 closed. F4 and F6 acknowledged with proper deferrals. No new
  blockers or majors. Verdict CONVERGED.

## Open before implementation
1. **F4 (owner):** confirm Claude may edit GitLab `vitana/ci-config`. Not a GitHub repo in the scope rules.
2. **F6 (implementation):** confirm the location of `pipeline-gen` in `vitana/ci-config` before the first render.
3. **VTID:** allocate through CI PLAN-SPAR. Do not allocate by hand.

## Final plan
<!-- plan:begin -->
## Problem
The per-landing job `.staging-verify` (main class) runs `shadow-wait.mjs ... --sha "$CI_COMMIT_SHA"`. On a `main`
pipeline, `CI_COMMIT_SHA` is the commit this pipeline was started for. If a later merge was deployed by another
pipeline before this verify ran, staging no longer serves that commit. The job then waits up to 60 minutes for a
commit staging will not serve, and fails. The nightly job `.staging-verify-nightly` already uses `--sha-from-staging`,
which checks the commit staging actually serves.

Observed: STAGING-VERIFY on `community-app` at `78455457` (run 828) failed in `verify`; `388bef0e` could never pass for
the same reason (Kiro 5 session report, not independently re-run).

## Change
1. **Core fix.** `.staging-verify` passes `--sha-from-staging` instead of `--sha "$CI_COMMIT_SHA"`. The served commit
   is read from staging, not from the pipeline's commit.
2. **Decide on the served commit, against this pipeline's deploy record (`deploy-runs.json`, the artifact
   `deploy-staging` writes):**
   a. served commit == this pipeline's deployed sha: verify it (normal path).
   b. served commit is a descendant of this pipeline's deployed sha: end as `superseded`, with no verification row
      written and the job passing. This is the same rule `.deploy-staging` already applies to a newer served commit.
   c. anything else (served commit is not this pipeline's deployed sha and not a descendant of it): fail with a
      named error. A verify never passes for a commit this pipeline did not deploy.
3. Shadow mode is unchanged: `DELIVERY_MODE` not `live` keeps `.record`, `.vtid-close`, `.notify-platform` disabled.
4. No change to `.staging-verify-nightly`, the resource groups, or the verification checks.

## Not in scope
- Changing what the verification checks.
- The GitHub STAGING-VERIFY path in `exafyltd/vitana-platform`: it passes the deployed commit from the deploy job within
  the same workflow, per the reviewer's reading of `AWS-STAGE-DEPLOY-FRONTEND.yml`. Confirming that is a verify step (below),
  not an edit.
- Enabling GitLab checks or switching the cut (owner-run steps).
- The `SUPABASE_ACCESS_TOKEN` rotation.

## Verification of the change
- Render the templates with `pipeline-gen --check` (tool referenced by the cutover status report; its location is to be
  confirmed in `vitana/ci-config` before implementation) and lint the rendered output with GitLab's linter.
- Rehearsal project (`vitana/rehearsal`, MR !1 path), shadow mode, three cases, each with recorded job output:
  - a. staging serves this pipeline's deploy: passes, verifies that sha;
  - b. staging serves a newer descendant: job ends `superseded`, passes, no row written;
  - c. staging serves a commit outside the lineage: job fails with the named error.
  Case c is set up by pointing the `deploy-runs.json` entry at a sha that differs from what staging serves.
- The GitHub STAGING-VERIFY path: read-only check that it passes the deployed sha, not `main`'s tip. If it does not, it
  goes back to sparring as a new scope item.

## Rollback
Revert the template change in `vitana/ci-config`. Shadow mode writes no verification row.
<!-- plan:end -->

## Planner responses (round 1)

- **F1 (major) deploy-runs.json, shadow-wait.mjs, pipeline-gen unverifiable — ACCEPTED, answered.** They are not in
  either GitHub repo; they live in GitLab `vitana/ci-config`. Evidence: `tpl-verify.yml` runs `shadow-wait.mjs` with
  `--deploy-runs-file "$DEPLOY_RUNS_FILE"`; `tpl-main.yml` states `deploy-staging` leaves `deploy-runs.json` as an artifact.
  `pipeline-gen` is named in the cutover status report; its location is still to confirm (see F6). Scope now names the project.
- **F2 (major) guard is scope creep — ACCEPTED in part.** `deploy-runs.json` already exists, so the guard is a comparison
  against an existing artifact, not a new subsystem. The guard is now the rule in Change 2 and is part of the core fix,
  because without it `--sha-from-staging` alone would verify a commit this pipeline did not deploy.
- **F3 (major) production STAGING-VERIFY path unaddressed — ACCEPTED as scope, verify step added.** The GitHub path is out of
  scope, with a read-only check listed under Verification; a failed check sends it back to sparring.
- **F4 (major) target repo may be outside the allowlist — ACCEPTED; DEFERRED to owner.** The target is GitLab
  `vitana/ci-config`, which is not one of the two GitHub repositories the scope rules name. Editing it needs the owner to
  confirm that access before the first edit. Sparring can proceed without that answer; implementation cannot.
- **F5 (minor) "serves an older commit" wording — ACCEPTED.** The Problem section now says staging "no longer serves this
  pipeline's commit", and Change 2 handles the newer-commit case explicitly.
- **F6 (minor) pipeline-gen and linter unconfirmed — ACCEPTED, DEFERRED to implementation.** Location to be confirmed in
  `vitana/ci-config` before the first render.
- **F7 (minor) negative test underspecified — ACCEPTED.** Verification now defines the three cases and how case c is set up.

Open for round 2: F4 is deferred to the owner, and F6 to implementation. The partner's verdict on F1–F3, F5 and F7 is requested.
