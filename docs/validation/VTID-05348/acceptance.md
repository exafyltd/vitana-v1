# VTID-05348 acceptance (quality-checks/v1-pr-template, tasks.md T1-T2)

Change types: Tooling/docs. Template text only, no executable behaviour, so no red-on-base test (plan
`quality-checks` §3/§4, converged). The reviewer checks the diff. Commands: `commands.log`.

AC-1 The dead GCP Cloud Run preview line (`community-app-q74ibpv6ia-uc.a.run.app`) is replaced by the per-PR preview
(`PREVIEW-DEPLOY-FRONTEND.yml` comments its URL) and staging `https://preview-aws.vitanaland.com`, both read-only.
TEST: grep -c "a.run.app" .github/PULL_REQUEST_TEMPLATE.md (0)

AC-2 Every other existing checklist item is kept unchanged.
TEST: git diff origin/main -- .github/PULL_REQUEST_TEMPLATE.md (only additions plus the preview line)

AC-3 A `## Verification` section asks per change type: UI screenshots at 1400×900 and 390×844 or a reason; the phone
code path; no hover-only control, logical properties, ar/RTL; de first and locale-format; keyboard, focus, labels,
contrast; edge states and late responses; staging proof that asserts the change (UTF-8 without BOM, spec listed);
Commerce UX acceptance.
TEST: grep -n "^## Verification" .github/PULL_REQUEST_TEMPLATE.md

AC-4 Only the lane's `paths` change (vitana-v1); deploys nothing.
TEST: node <vitana-platform>/scripts/collab/preflight.mjs --repo <v1 WT> (Lane scope PASS)
