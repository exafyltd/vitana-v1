# Plan sparring record — VTID-05016

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard (.github); rounds: 2
- Plan hash (sha256 of text between plan markers): 6499ffa211ebd1119fa1682f84bc04e00e2f0f92fec4c0b4860fa1344cb5307c
- Verdict: **converged** (no blocker, major or minor)
- Owner approval: chat, 2026-10-09 — "yes" to the Gate 1 message.

## Rounds
- R1: all premises verified (three `image: postgres:16` lines at the cited lines; PR-GATE already on the mirror; no other Docker Hub image in `.github/` or `scripts/`; each workflow self-triggers on its own path). F1 retracted on verification. CONVERGED.
- R2: plan unchanged, no new findings. CONVERGED.

## Plan (verbatim)

# Plan — SQL test workflows pull Postgres from AWS's mirror, not Docker Hub

<!-- plan:begin -->
## Problem
On 2026-10-09 Docker Hub's anonymous pull limit (429) and then an auth.docker.io outage (504 /
timeouts) failed production builds and PR-GATE. VTID-05015 (#1303, merged ca550b0) moved the
Dockerfile and PR-GATE's Postgres to `public.ecr.aws/docker/library/*`. Three SQL test workflows
still pull `postgres:16` from Docker Hub and fail the same way when it is limited or down:
- `.github/workflows/SQL-EVENT-SHARE-POSTS.yml:26`
- `.github/workflows/SQL-GROUP-PARTICIPANTS.yml:25`
- `.github/workflows/SQL-THREAD-JOIN-HARDENING.yml:26`
A repo-wide grep finds no other Docker Hub image reference in `.github/` or `scripts/`.

## Change class
`standard` (touches `.github`), 3 one-line edits; no app code, no deploy, no migrations.

## Change
In each of the three files: `image: postgres:16` → `image: public.ecr.aws/docker/library/postgres:16`
(same official image and tag; manifest verified HTTP 200 earlier tonight; PR-GATE already runs this
exact image green). One comment line naming the reason, matching PR-GATE's.

## Validation
Each workflow's `pull_request.paths` includes its own file, so the PR runs all three: they must start
the Postgres service from the mirror and pass their SQL tests. No staging/prod deploy → no Gate 2;
done when merged with green checks. Also `actionlint`-style sanity: YAML parses (python yaml load).

## Out of scope
Anything not pulling from Docker Hub; the VTID-05013 ledger note (closed row, left as is).
<!-- plan:end -->
