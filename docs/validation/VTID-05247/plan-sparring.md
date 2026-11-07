# VTID-05247 — Plan sparring record (Native app Wave 1, native-g1-wiring, lane `build-profiles`)

- **VTID:** VTID-05247 (vitana-v1). Lane `native-g1-wiring/build-profiles` (tasks B1–B3 in
  `vitana-platform:.kiro/specs/native-g1-wiring/tasks.md`, section `<!-- lane: build-profiles -->`).
- **Program:** VTID-05021 (Native app), Wave 1 exit, `docs/programs/native-app/NATIVE-APP-PLAN.md` §5.
- **Plan:** `vitana-platform:.kiro/specs/native-g1-wiring/plan.md` (plan block between the plan markers).
- **Partner:** CI `PLAN-SPAR.yml` on the `plan(native-g1-wiring)` PR, session
  `8e2ff780-0c8c-4730-9181-adb96525b085`.
- **Verdict:** CONVERGED.
- **Approval:** policy `converged-auto-v1` at 2026-10-20T08:33:08Z (recorded in
  `vitana-platform:.kiro/specs/native-g1-wiring/sparring/verdict.md`).
- **Plan hash:** `85aeb40ea3a28cf4833b20ff5f6d726371cf9f970f2994dd76ae735545514f64` (final plan hash, sha256
  of the text between the plan markers, as recorded in that verdict).
- **Change class:** standard.
- **Owner approval:** not given separately. The owner decision of 2026-10-14 makes policy `converged-auto-v1` the approval for CI-sparred plans that converge, which is the approval recorded above.

## Scope of this lane within the sparred plan

Decision 2 of the plan: one EAS config with `development` and `test-g1` profiles that set only `APP_PROFILE`,
plus one offline, secret-free NATIVE-CI step that bundles both profiles and compares host literals. The lane
adds no production profile, no store or signing config, no Expo token, and no EAS cloud build.
