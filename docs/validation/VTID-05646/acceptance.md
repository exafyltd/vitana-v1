# VTID-05646 acceptance (sharing lane)
- [x] Change types: UI, Tooling/docs
- [x] 8 routes ported; ledger rows native; `parity-ledger --check`, `core-closure --check` green
- [x] `@vitana/core`-only web bridge; no `html2canvas`; native `captureRef` share card
- [x] i18n: sharingNative in 11 locales, same keys, du-form; no physical left/right
- [x] `npm run typecheck`, `npm test` (205 suites / 5720 tests), `deps:check`, `bundle` green
- [x] Tests offline, no production access
- [ ] Device parity (Maestro): G1, owner
