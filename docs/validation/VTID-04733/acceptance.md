# VTID-04733 — What's New manifest (frontend half)

Every build now publishes `/whats-new.json`, merged from one file per
user-facing change in `src/whats-new/entries/`. The gateway's daily job turns
new entries into "Brand New Feature" News Feed cards once the build is live in
production. Ships with zero entries: nothing is announced by this PR itself.

- AC-1: the build publishes a well-formed manifest.
  TEST: npx vitest run src/whats-new
  CURL: GET preview-aws.vitanaland.com/whats-new.json has `"entries"` (read-only)
- AC-2: a malformed entry (missing DE, Sie-form, unknown deepLink, id != file name) fails the build.
  TEST: npx vitest run src/whats-new
- AC-3: the script is inside the Docker build context (`!scripts/whats-new`).
  TEST: npx vitest run src/whats-new
