# VTID-05333 — acceptance (staging-verify-runner-fix / manifests)

STAGING-VERIFY community-app run 39757004449 failed four native change-suite entries on setup, not on tests.
Measured locally in `apps/mobile` with the runner's minimal env (`env -i PATH HOME CI=1 NODE_ENV=test`):

| entry | origin/main | this branch |
|---|---|---|
| VTID-05298 `npx jest tests/news` | "Cannot find module './catalog-map.generated'" (no `gen:i18n`) | `npm run gen:i18n` first → 1 suite / **17 tests passed** |
| VTID-05296 `npx jest tests/community --config apps/mobile/jest.config.js` | "Can't find a root directory…" | `npx jest tests/community` → 8 suites / **49 tests passed** |
| both: `npm run bundle` | "APP_PROFILE is not set" | `env: {APP_PROFILE: development}` → "Exported: dist" (iOS + Android) |

No entry is removed or weakened: every original entry is still present (5 entries each, 4 before + `gen:i18n`).
Both manifests pass `validateManifest` from vitana-platform `scripts/ci/staging-verify/lib.cjs` with the lane-`runner`
change (VTID-05334). Merge only after `runner` is on vitana-platform `main` (R1-F2; M3).
