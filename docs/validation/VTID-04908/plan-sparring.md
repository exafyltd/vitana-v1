# VTID-04908 — plan sparring record

Plan hash, canonical (VTID-04868 `canonical-hash.ts`): `7db9e377e59528f8b1fe592d6380686dc15dbedfdf7658f392c1a4714dc67175`; raw sha256 of the text between the markers, as recorded at allocation: `0ef097b03457dbe86424b8cfc15db1974ac09f0ad890f5c091eaa1a2b74f53ad`. Partner: plan-sparring-partner. Owner approval: 2026-10-06 ("yes"). The plan block is kept verbatim; its `vtid-XXXXX` / `<VTID>` placeholders are VTID-04908 (allocated after approval).


Planner: Claude Code session (owner: d.stevanovic@exafy.io). Date: 2026-10-06. Priority: low (owner).

<!-- plan:begin -->
## Problem (observed 2026-10-06)
`DEPLOY.yml` (manual `workflow_dispatch`, `commit_sha=166b4612…`) → `AWS-PROD-DEPLOY-FRONTEND.yml` checked out and built `166b4612` (`actions/checkout` `ref: ${{ inputs.commit_sha != '' && inputs.commit_sha || github.sha }}`, L140; `VITE_APP_VERSION=$(git rev-parse --short=12 HEAD)`, L148; the live site reports `vitana-app-version=166b4612a321`). But the "Build and push image" step tags the image `awsdr-${GITHUB_SHA::12}` (L186-187) — `GITHUB_SHA` is the dispatch ref's HEAD (`main` = `6db3b22d`), so ECR holds `community-app:awsdr-6db3b22d532a` containing the `166b4612` build. Anyone choosing a rollback image by tag would pick the wrong code. The run summary repeats the wrong tag. The direct `workflow_dispatch` of `AWS-PROD-DEPLOY-FRONTEND.yml` (its own `commit_sha` input) has the same defect and is fixed by the same change. Staging (`AWS-STAGE-DEPLOY-FRONTEND.yml`) has no ref/commit input and always builds `GITHUB_SHA`, so its tag is correct by construction — out of scope.

## Change (vitana-v1 only, one file + test)
1. `AWS-PROD-DEPLOY-FRONTEND.yml` "Build and push image": `SHORT_SHA="$(git rev-parse --short=12 HEAD)"` — the checked-out commit, the same source `VITE_APP_VERSION` uses, so the image tag and the version the app reports cannot disagree. Add one log line `Built commit: $(git rev-parse HEAD) (dispatch ref: $GITHUB_SHA)`.
2. Guard: when `inputs.commit_sha` is set, lowercase it, require at least 7 hex characters, and fail the step if `git rev-parse HEAD` does not start with it (the checkout did not land on the requested commit) — before any image is pushed or the service rolled.
2b. The run summary (`GITHUB_STEP_SUMMARY`) also states `Built commit:` and `Dispatch ref:` so the difference is visible without opening the step log.
3. No change to `awsdr-latest`, the task-definition step, ECS, secrets, `DEPLOY.yml`, or the staging workflow. Existing ECR images are not retagged (immutable history; the mislabelled `awsdr-6db3b22d532a` is recorded in this VTID's validation notes as containing `166b4612`).

## Tests
`src/lib/deploy-workflow.vtid-XXXXX.test.ts` (vitest, reads the workflow like `deploy-workflow.vtid-04854.test.ts`):
- the image tag is derived from `git rev-parse --short=12 HEAD`; the negative check is scoped to the `SHORT_SHA=` assignment line (`GITHUB_SHA` legitimately appears in the new log/summary lines);
- `VITE_APP_VERSION` and the tag use the same expression;
- the commit_sha guard exists (lowercased, ≥7 characters, prefix match) and comes before `docker push`;
- the run summary names the built commit and the dispatch ref;
- the build step runs after `actions/checkout` with the `commit_sha` ref.
YAML parses and the run block passes `bash -n` (checked locally).

## Verification / rollout
- PR CI (vitest) + `STAGING-TESTS-REQUIRED`: `docs/validation/<VTID>/staging-tests.json` lists the vitest file (existing kind). The change touches no app code, so the staging deploy and STAGING-VERIFY prove only that nothing else changed.
- The fix takes effect on the next production frontend deploy; that deploy is not part of this VTID and still needs its own owner approval. Its run log must show `Built commit:` equal to the image tag and to the live `vitana-app-version`.
- Not mixed with Partner Terms or any other change.

## Change class
standard (touches a `.github` deploy workflow).

## Scope
vitana-v1: `.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml`, new `src/lib/deploy-workflow.vtid-XXXXX.test.ts`, `docs/validation/<VTID>/`.
<!-- plan:end -->


## Planner responses — round 1
- F1 [minor] ACCEPTED — built commit and dispatch ref also go to `GITHUB_STEP_SUMMARY` (item 2b) and are tested.
- F2 [minor] ACCEPTED — the guard lowercases the input and requires ≥7 hex characters before the prefix match.
- F3 [minor] ACCEPTED — the problem statement names the direct `workflow_dispatch` path too; same fix covers it.
- F4 [minor] ACCEPTED — the negative assertion is scoped to the `SHORT_SHA=` line.

## Round 2 — partner status
F1 closed · F2 closed · F3 closed · F4 closed. No new findings. Questions: none.

## Verdict
CONVERGED after 2 rounds (standard class). Awaiting owner approval.
