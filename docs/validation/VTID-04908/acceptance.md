# VTID-04908 — production frontend image tag names the built commit

Priority: low (owner, 2026-10-06). Not mixed with Partner Terms or any other change.

## Problem
`DEPLOY.yml` run 37430818817 (pinned `commit_sha=166b4612…`, dispatched from `main` = `6db3b22d…`)
built and shipped `166b4612` — the live `vitana-app-version` is `166b4612a321` — but tagged the
image `community-app:awsdr-6db3b22d532a`, because the tag came from `GITHUB_SHA`.

**Record for rollback:** ECR image `awsdr-6db3b22d532a` contains commit `166b4612`, not
`6db3b22d`. Existing images are not retagged.

## Change
`.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml`, "Build and push image":
- the tag comes from `git rev-parse --short=12 HEAD` (same expression as `VITE_APP_VERSION`);
- when `commit_sha` is given, it is lowercased, must be 7–40 hex characters, and the
  checked-out commit must start with it — otherwise the step fails before any `docker push`;
- log line `Built commit: … (dispatch ref: …)` and the run summary lists `Built commit` and
  `Dispatch ref`.

Nothing else changes (`awsdr-latest`, task definition, ECS, `DEPLOY.yml`, staging workflow).

## Verification
- `src/lib/deploy-workflow.vtid-04908.test.ts` (vitest, CI).
- Locally: YAML parses; the build step's run block passes `bash -n`; the guard was exercised
  for empty input (skip), an upper-case prefix of HEAD (match), a different commit (fail) and
  non-hex input (fail).
- Takes effect on the next production frontend deploy, which needs its own owner approval.
  That run's log must show `Built commit:` equal to the image tag and to the live
  `vitana-app-version`.
