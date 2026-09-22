---
paths:
  - .github/workflows/**
---

# Infrastructure reference — vitana-v1

Moved verbatim out of `CLAUDE.md` on 2026-09-22 (pure relocation, content
unchanged) so a session that never touches a deploy workflow doesn't
force-load AWS/staging-cutover/PR-preview deployment detail. The
no-production-write absolute rule stays in the root `CLAUDE.md`, unscoped,
because it must apply regardless of which files a session happens to open
in a given turn.

---

## Deployment — production is AWS. GCP is fully decommissioned, not a rollback target.

**`vitanaland.com` and `www` are served by the AWS ECS service
`vitana-community-app-awsdr`.** This moved at the VTID-03419 cutover
(2026-07-27) and became the *only* option 2026-08-16, when GCP project
`lovable-vitana-vers1` had billing disabled and its `gateway` Cloud Run
service was deleted outright (VTID-03599/VTID-03649, see
`exafyltd/vitana-platform` CLAUDE.md §1). **Cloud Run's `community-app` is
no longer a usable rollback target — GCP billing is off, so nothing
deployed there can serve traffic even if the service object still exists.**
There is no cloud to roll back to but AWS.

| Host | Serves | Role |
|------|--------|------|
| **AWS ECS** `vitana-community-app-awsdr` | `vitanaland.com`, `www`, `dr-app.vitanaland.com` | **Production — the only place that serves traffic** |
| ~~Cloud Run `community-app`~~ | ~~its own `*.run.app` URL~~ | **Dead — GCP billing is off. Do not treat as a rollback target.** |
| Lovable CDN | `vitana-lovable-vers1.lovable.app` | Legacy, being decommissioned |

`DEPLOY.yml`'s `aws_prod` job (calling `AWS-PROD-DEPLOY-FRONTEND.yml`) is
now the only leg that matters. If it still has a GCP/Cloud Run deploy job
alongside it, that job is dead weight — it will fail against
disabled billing, not silently succeed, so at least it won't be mistaken
for a working rollback. **If you edit `DEPLOY.yml`, keep `aws_prod`** and
treat removing the dead GCP job as a safe, low-priority cleanup.

### Verifying a frontend deploy actually shipped

A green workflow is not evidence. Check the bytes production serves, and
sample repeatedly — an ECS rolling deploy serves the old and new build
side by side for a minute or two, so a single request can report either:

```bash
for i in $(seq 1 20); do
  curl -s "https://vitanaland.com/<page>?s=$i" \
    | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1
done | sort | uniq -c
```

Only when all samples agree on the new chunk is the deploy live. Then grep
that chunk for a string unique to your change. Cloudflare fronts the apex
but sends `cf-cache-status: DYNAMIC` with `no-store` for the SPA shell, so
a stale response means the rollout is still in flight, not a cache.

### Staging-first cutover (effective Mon 8 Jun 2026, 10:00 Europe/Berlin)

Auto deploy-to-live is **time-gated**. Before the cutover instant, a push to
`main` deploys the **live** `community-app` as before. At/after it, the
automatic (push) path in `DEPLOY.yml` is **frozen** (via its `cutover_gate`
job): frontend changes auto-deploy to **staging** (ECS
`vitana-community-app-staging` via `AWS-STAGE-DEPLOY-FRONTEND.yml`, on
**`preview-aws.vitanaland.com`**), and production is reached only via:

1. the single **PUBLISH** button in the backend Command Hub, or
2. a deliberate manual `workflow_dispatch` of `DEPLOY.yml` (requires a `reason`)
   — the documented exception.

**If a production deploy is approved WITHIN a Claude Code session** (the
user approves shipping to prod in conversation, carried out via path 2
above rather than PUBLISH) → that approval scopes to this session's own
change only, never to whatever else is currently sitting on `main`/staging.
PUBLISH is a deliberate, human-operated decision to promote the *entire*
tested staging build; an in-session approval is not that — it's consent
for the specific fix this session produced. `DEPLOY.yml`'s manual dispatch
takes a `commit_sha` input that defaults to `github.sha` (i.e. whatever
`main` HEAD is at dispatch time) — **always pass this session's own merge
commit SHA explicitly** rather than accepting that default, so the deploy
can't silently carry along other work that lands on `main` AFTER it.

**Pinning a commit SHA is necessary but not sufficient.** `commit_sha` is
checked out as a full repository snapshot (`ref: ${{ inputs.commit_sha ...
}}`), not applied as a diff — so a pinned commit still ships every commit
that is already an ANCESTOR of it, including anything merged to `main`
before this session's own PR that this conversation never reviewed or
approved. Before dispatching: diff the pinned commit against the revision
currently live in production (its build-info/health endpoint reports the
deployed commit) and confirm every commit in that range is either this
session's own work or something the user has separately approved for this
deploy. If that range contains changes this conversation didn't produce or
the user hasn't approved, and they can't be excluded (the deploy ships a
full snapshot, never a pinned diff), stop and tell the user exactly what
else would ship alongside theirs before proceeding.

`supabase-functions-deploy.yml` is gated the same way (no staging-functions
auto-deploy yet, so it is freeze-only on the auto path post-cutover; ship via
manual dispatch). `STAGE-DEPLOY-FRONTEND.yml` is **not** gated — staging deploys
always run. The backend half of the cutover lives in `exafyltd/vitana-platform`.

### GCP billing is OFF — where staging and previews live now (VTID-03658)

GCP billing on `lovable-vitana-vers1` was **deliberately disabled**. Anything
that deploys Cloud Run or pushes to Artifact Registry now fails with
`BILLING_DISABLED`, and **`preview.vitanaland.com` returns 500**. It is not
coming back; do not send anyone there and do not "fix" a red Cloud Run deploy.

**Staging did not have to move — it was already on AWS in parallel.**
`AWS-STAGE-DEPLOY-FRONTEND.yml` has been auto-deploying every push to `main`
onto ECS `vitana-community-app-staging` the whole time. That is now the only
staging frontend:

| Surface | URL |
|---|---|
| **Staging frontend** | **`https://preview-aws.vitanaland.com`** |
| Staging gateway | `https://preview-aws-gateway.vitanaland.com` |
| ~~Cloud Run staging~~ | ~~`preview.vitanaland.com`~~ — dead, 500 |

`STAGE-DEPLOY-FRONTEND.yml` is **retired**: its push trigger is removed and
only `workflow_dispatch` remains, so it can be revived unchanged if billing
ever returns. The file is kept rather than deleted because
`preview.vitanaland.com` still appears in older docs, bookmarks and PR
comments, and whoever lands on it needs to find out where staging went.

### Per-PR preview deploys — S3 + CloudFront

Every open PR touching frontend files gets its own prefix on a shared bucket,
served over CloudFront at `/<pr-number>/`:

- `PREVIEW-DEPLOY-FRONTEND.yml` builds with `--base=/pr-<n>/`, syncs to
  `s3://vitana-pr-previews/pr-<n>/`, invalidates, verifies the CDN actually
  serves that commit's assets, and posts/updates a PR comment.
- `PREVIEW-TEARDOWN-FRONTEND.yml` removes the prefix when the PR closes. A
  30-day bucket lifecycle rule is the backstop for teardowns that never ran.
- One-time provisioning: **`scripts/aws/setup-pr-previews.sh`** (bucket,
  SPA-fallback CloudFront function, scoped IAM). Needs the
  `PREVIEW_CF_DISTRIBUTION_ID` / `PREVIEW_CF_DOMAIN` repo secrets it prints;
  without them the deploy workflow fails fast with a named reason instead of
  half-deploying.

**Why not a per-PR ECS service:** it would need a task definition, service,
target group AND an ALB listener rule per PR — and listener-rule *priority*
has already caused one silent misroute here (§1b in the platform repo: the
path rules at priority 10 match before higher-numbered host rules regardless
of `Host`). Churning those per pull request invites that failure on a
schedule. S3 prefixes have no ordering to get wrong. The app is a static SPA;
the container was never doing anything a CDN does not.

**Still do not point a feature branch at the shared staging service.** Two
branches doing that back-to-back overwrite each other's verification — that
happened and reverted a merged fix on staging. Use the PR's own preview URL.

