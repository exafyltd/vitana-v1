# VTID-05157 — acceptance (Native app Wave 0: Expo skeleton, Linux CI, parity ledger, extraction analysis)

Program VTID-05021 (Native app), Wave 0. Sparred plan: `plan-sparring.md` (CONVERGED, owner-approved 2026-10-13).

## Deploys nothing — no staging suite, no Gate 2

The change touches no community-app deploy path (`src/**`, `public/**`, `index.html`, `Dockerfile`, `nginx.conf`,
root `package.json` / `package-lock.json` / `bun.lock`, `vite.config.ts`, `AWS-STAGE-DEPLOY-FRONTEND.yml`; canonical
list vitana-platform `scripts/ci/staging-verify/lib.cjs`). `STAGING-TESTS-REQUIRED` therefore passes with "nothing
deploys, no staging suite needed", there is no `staging-tests.json`, and the change is done when merged with green
checks (Autonomy Contract). `apps/` is in `.dockerignore`, so the web image build context is unchanged.

## Acceptance criteria → evidence

| # | Criterion | Evidence |
|---|---|---|
| 1 | `apps/mobile/` is a self-contained Expo + TypeScript project with its own lockfile, exact pins, latest stable SDK ≥ 2 weeks old | `apps/mobile/package.json` (Expo SDK 57, `expo@57.0.25` published 2026-09-24), `apps/mobile/package-lock.json`; `npm run deps:check` (offline, against the pinned SDK) green |
| 2 | Type-checks, tests and bundles JS for iOS and Android on Linux, no native build | `npm run typecheck`, `npm test` (jest-expo), `npm run bundle` (Metro + Hermes `.hbc` for both platforms); NATIVE-CI job `mobile` |
| 3 | No production or staging host can be configured; no default URL | `apps/mobile/src/config/env.ts`; `tests/env.test.ts` |
| 4 | No production profile; `.dev` identifiers; no `googleServicesFile` | `apps/mobile/app.config.ts`; `tests/app-config.test.ts` |
| 5 | Native i18n reads the web shards (11 locales, `_audit.json` skipped), falls back to `de`, `ar` is RTL; the map is generated and gitignored | `scripts/native/gen-i18n-map.mjs`, `apps/mobile/src/i18n/`; `tests/i18n.test.ts`, `scripts/native/__tests__/gen-i18n-map.test.mjs` |
| 6 | Placeholder screens render only existing catalog keys | `app/index.tsx` (`common.loading`), `app/+not-found.tsx` (`errors.pageNotFound*`); `tests/index.test.tsx` |
| 7 | Extraction dependency analysis with classes, signals with lines, blocking chains, cycles and a Candidates section; snapshot committed | `scripts/native/extraction-deps.mjs`, `docs/programs/native-app/EXTRACTION-ANALYSIS.md` (merge-base `55cabeab2`); `scripts/native/__tests__/extraction-deps.test.mjs` |
| 8 | Parity ledger: one row per web destination; `--check` fails on (a)–(f); `--sync` idempotent | `apps/mobile/parity/ledger.json` (434 rows), `scripts/native/parity-ledger.mjs`, `scripts/native/parity-scope.json`; `scripts/native/__tests__/parity-ledger.test.mjs` |
| 9 | ESLint: `apps/mobile` override (RN globals, banned web globals / `import.meta` / web clients), i18n rules stay on, web lint unchanged | `eslint.config.js`; `scripts/native/__tests__/eslint/mobile-override.test.mjs` |
| 10 | `accessibilityLabel` / `accessibilityHint` are translatable attributes | `eslint-rules/no-raw-jsx-text.js`; `scripts/native/__tests__/eslint/no-raw-jsx-text.test.mjs` |
| 11 | CI on Linux, no secrets, offline Expo | `.github/workflows/NATIVE-CI.yml` (`permissions: contents: read`, `EXPO_OFFLINE=1`) |
| 12 | Governance: CLAUDE.md rule for ledger rows; `.dockerignore` keeps `apps/` out of the web image | `CLAUDE.md` ("Native parity ledger"), `.dockerignore` |

## Out of scope (gate)

Native builds / simulators / Maestro / screenshot tooling (STATUS row 8b: macOS minutes, G1), ORB audio spike (G1 +
iOS device), store identifiers and signing (G3), push / Firebase (G2), any network client (G1, Wave 1),
`packages/core` / `packages/tokens` / workspaces (Wave 1). The vitana-platform STATUS rows 8/8b update is a separate
docs-only PR.
