# VTID-05519 acceptance (eng-platform-p01/stage-oidc-v1)
Change types: Infrastructure/CI.
AC-1 AWS-STAGE-DEPLOY-FRONTEND uses vars.AWS_STAGING_ROLE_ARN; both preview workflows use vars.AWS_PREVIEW_ROLE_ARN; the staging keys only behind !vars.<ROLE>; id-token: write at top level.
TEST: vitest eng-platform-stage-oidc ("uses the role variable with the key guard ...", "grants id-token: write ...").
AC-2 Every static-key workflow except AWS-PROD-DEPLOY-FRONTEND.yml is covered (grep-based); the prod deploy is unchanged.
TEST: vitest ("every static-key workflow except the production deploy is covered", "AWS-PROD-DEPLOY-FRONTEND.yml is not changed").
AC-3 Preview deploy preflight and teardown gate accept the role variable instead of the keys.
TEST: vitest ("the preview deploy accepts ...", "the preview teardown treats ...").
Staging proof: not verified on staging (OIDC path): role not created yet (owner step); the merge redeploys staging on the unchanged key path.
