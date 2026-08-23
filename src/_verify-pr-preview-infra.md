# PR preview infra verification (VTID-03658)

One-time throwaway file to trigger `PREVIEW-DEPLOY-FRONTEND.yml` and confirm
the S3 + CloudFront PR-preview pipeline works end to end now that
`PREVIEW_CF_DISTRIBUTION_ID` and `PREVIEW_CF_DOMAIN` are set. Not imported
anywhere, not part of the build output. Safe to delete once verified — the PR
that adds it is not meant to be merged.
