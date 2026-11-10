# VTID-05647 verification

Offline only: `npx jest tests/shell-fixes` (2 red on base for the doubled journey path and the commerce redirect, green after), full `npx jest --maxWorkers=2` 203 suites / 5626 tests green, `npm run typecheck` green. Native app has no staging deploy; device runtime waits for G1. See `acceptance.md` for what is deferred and why.
