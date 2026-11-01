# VTID-05297 fix-forward — stale core extract headers on main (2026-11-01)

`node scripts/native/gen-core-extract.mjs --check` fails on origin/main a41e89a0d (and on every native lane PR, CI job
"Parity ledger, core/tokens generators + native script tests"):

    gen-core-extract: out of date: packages/core/src/extracted/news-feed-ranker.generated.ts, packages/core/src/extracted/feed-compose.generated.ts

Cause: web commits changed `src/lib/feed-compose.ts` and `src/lib/news-feed-ranker.ts` without regenerating the
extracts this lane (home) owns. Only the `sha256` source-header line of each generated file differs; the copied
declarations are byte-identical (`git diff` = 2 lines per file).

Fix: `node scripts/native/gen-core-extract.mjs` (regenerated headers). After: `--check` → "up to date";
`node scripts/native/core-closure.mjs --check` → up to date (no closure change).
No behaviour change, no test touched.
