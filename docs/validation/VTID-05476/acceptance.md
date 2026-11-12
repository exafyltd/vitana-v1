# Acceptance — VTID-05476 (welcome-finish-r2 / native-extract-regen)

Plan: `exafyltd/vitana-platform:.kiro/specs/welcome-finish-r2/plan.md` §2.3 and §4, `tasks.md` C1–C3.

**Finding: the drift this lane was written to fix is already gone on `origin/main`.** The plan's premise was checked at
`847a9f686`. Since then VTID-05427 (`ec8682fec`, 2026-11-01) regenerated `packages/core/src/extracted/*.generated.ts`.
On `origin/main` `e1ab28b1f` both generators report "up to date" (exit 0), so there is nothing to regenerate and this
lane carries evidence only. No runtime or generated file changes.

AC-1 `gen-core-extract.mjs --check` exits 0 on the current base, so NATIVE-CI's generators job is not red because of this drift.
TEST: `node scripts/native/gen-core-extract.mjs --check` (see `outputs/red-on-base.txt`, exit 0).

AC-2 `core-closure.mjs --check` exits 0 on the current base.
TEST: `node scripts/native/core-closure.mjs --check` (see `outputs/red-on-base.txt`, exit 0).

AC-3 The lane changes no file outside `docs/validation/VTID-05476/**`.
TEST: `git diff --stat origin/main...HEAD` lists only that folder.

Red on base: **not reproducible**; the check is already green on base (premise superseded by VTID-05427).
Staging proof: not verified on staging; no behaviour change. A PR on the Say Hello branch (#1520) needs to merge or
rebase onto current `main` to pick up the regenerated files.
