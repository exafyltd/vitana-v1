# VTID-05683 — plan sparring record (native-wave1-readiness-tests, lane push)

Copied from the plan branch `origin/kiro/native-wave1-readiness-tests/plan` (plan PR exafyltd/vitana-platform#4938, still open); the sparring files live under `.kiro/specs/native-wave1-readiness-tests/sparring/` there.

Verdict: CONVERGED (2 rounds), approved by policy converged-auto-v1 at 2026-11-10T17:04:14.124+00:00.
Plan hash: sha256:ac2bba601b5f4ed161225d06b9d07be0311d2e532e1c27a84d903a51dff71e10 (final_plan_hash, sparring/state.json).
Approval: policy approval converged-auto-v1.

## verdict.md
# Verdict — native-wave1-readiness-tests

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-10T17:04:14.124+00:00.
Session `5f2b3055-4acc-4eb6-be8e-6b1f1f4c44df` · final plan hash `ac2bba601b5f4ed161225d06b9d07be0311d2e532e1c27a84d903a51dff71e10`.
VTIDs: VTID-05681, VTID-05682, VTID-05683, VTID-05684

## responses-1.md
# Responses to sparring round 1

```json
[
  {"finding_id": "R1-F1", "disposition": "accepted", "rationale": "The plan text listed only three evidence globs while the lane files already list five (acceptance.md, commands.log, scope.json, staging-tests.json, plan-sparring.md). plan.md now lists the same five, so acceptance.md and commands.log are in scope. The broader docs/validation/VTID-*/** is not used: the lane files (which a _plan commit cannot edit after creation) name the files exactly, and the lane scope check passed on them (preflight, Lane scope). Same shape as merged native-wave3-release-r2/lanes/crash-port.md.", "deferred_to": ""},
  {"finding_id": "R1-F2", "disposition": "accepted", "rationale": "The partner cannot read vitana-v1, so plan.md gains a 'Premise evidence' section quoting the vitana-v1 facts (jest.config roots/testMatch, helper exports with lines, symbol lines, the behaviours the cases assert) at the pinned SHA e31bf4627ff3c705c20f8e6b718ce4dd03353b7f. tasks.md gains 'Task 0' for every lane: re-check each premise against vitana-v1 origin/main before writing a test, record it in commands.log, adapt or drop a case whose premise is stale, and never edit source to make a premise true.", "deferred_to": ""},
  {"finding_id": "R1-F3", "disposition": "accepted", "rationale": "Citation corrected to land-guard.mjs:31 (EVIDENCE_FILES) and :38-41 (evidenceMissing) in plan.md.", "deferred_to": ""}
]
```

## round-1.md
# Sparring round 1 — in_progress

Session: `5f2b3055-4acc-4eb6-be8e-6b1f1f4c44df` · plan hash `ca41cbaa252718beeda7945a0170a4aaa2ac15c9eeab3d91d2e67cf7227c98e2`

## Summary

The plan is well-structured and conservative (new test files only, no source changes). However, the vitana-v1 repo is not pinned in this review session, so none of the core premises about Jest config, existing test files, source code line numbers, or helper exports can be verified against actual code. Within the verifiable scope (vitana-platform governance tooling), I found a concrete lane-scope defect that would block the evidence gate, and flagged the unverifiable premises.

## Findings

### R1-F1 [major]

The lane scope declares `docs/validation/VTID-*/{scope.json,staging-tests.json,plan-sparring.md}` but omits `acceptance.md` and `commands.log`, which are two of the three required evidence files. land-guard.mjs (line 31) defines `EVIDENCE_FILES = ['acceptance.md', 'commands.log', 'scope.json']` and the `evidenceMissing` function (lines 38-41) enforces that all three exist before a code commit. The plan's own Measurement section says each lane reports via `docs/validation/<VTID>/acceptance.md`, which contradicts the scope glob. The established convention (VTID-05541, VTID-05542) uses `docs/validation/VTID-XXXXX/**` to cover all validation artifacts.

- `exafyltd/vitana-platform:scripts/collab/land-guard.mjs:31` — export const EVIDENCE_FILES = ['acceptance.md', 'commands.log', 'scope.json'];
...
return EVIDENCE_FILES.map((f) => `docs/validation/${vtid}/${f}`).filter((p) => !have.has(p));
- `exafyltd/vitana-platform:docs/validation/VTID-05541/scope.json:14` — "docs/validation/VTID-05541/**"
- `exafyltd/vitana-platform:docs/validation/VTID-05542/scope.json:19` — "docs/validation/VTID-05542/**"

Suggestion: Change the lane scope docs glob from `docs/validation/VTID-*/{scope.json,staging-tests.json,plan-sparring.md}` to `docs/validation/VTID-*/**` (matching the established convention) so that `acceptance.md` and `commands.log` are in scope and the evidence gate passes.

### R1-F2 [blocker]

Every factual premise about vitana-v1 is unverifiable because that repo has no pinned ref in this review session. The plan's entire Measured State section — Jest config (`roots`, `testMatch`), existence and case-counts of 20+ test files, helper exports (`fakeGateway`, `makeWrapper`, `createSupabaseDouble`, `fakeSession`), source file symbols and line numbers (`AuthGate` at `src/shell/AuthGate.tsx:36`, `LOCALES` at `src/i18n/index.ts:16`, `oauthErrorKey` at `src/auth/sign-in.ts:69`, etc.), the non-existence of `tests/wave1-readiness/`, and the gap analysis — rests on vitana-v1 code that cannot be read. If any of these premises are wrong (file renamed, line numbers shifted, symbol removed, Jest config changed, helper API different), the lanes will produce tests that fail or target the wrong code. The plan declares it was pinned at vitana-v1 commit e31bf46, but the review session only pins vitana-platform@6dc6e1b.

- `exafyltd/vitana-platform:docs/programs/native-app/program.md:6` — repos: [vitana-v1, vitana-platform]

Suggestion: Either (a) pin vitana-v1 in the review session so premises can be verified, or (b) add a lane-zero pre-flight step that re-checks every premise (file existence, line numbers, symbol grep, Jest config roots/testMatch, helper export names) against the vitana-v1 pin before any test file is written, and fails the lane if any premise is stale. Without this, the plan is building on unverified ground.

### R1-F3 [minor]

The plan cites `land-guard.mjs:40` for the evidence file list (`acceptance.md`, `commands.log`, `scope.json`). The `EVIDENCE_FILES` constant is actually on line 31; line 40 is inside the `evidenceMissing` function body. This is a minor inaccuracy in the citation.

- `exafyltd/vitana-platform:scripts/collab/land-guard.mjs:31` — export const EVIDENCE_FILES = ['acceptance.md', 'commands.log', 'scope.json'];
export const OK_CONCLUSIONS = new Set(['success', 'skipped', 'neutral']);
...
export function evidenceMissing(paths, vtid) {
  const have = new Set(paths);
  return EVIDENCE_FILES.map((f) => `docs/validation/${vtid}/${f}`).filter((p) => !have.has(p));
}

Suggestion: Correct the citation to `land-guard.mjs:31` (constant) or `:38-41` (function).

## Next

Planner: answer every finding above in `sparring/responses-1.md` as one ```json block
`[{"finding_id": "...", "disposition": "accepted|rejected|deferred", "rationale": "...", "deferred_to": "..."}]`,
update `plan.md` (the plan block), commit both and push. That push starts the next round.

## round-2.md
# Sparring round 2 — converged

Session: `5f2b3055-4acc-4eb6-be8e-6b1f1f4c44df` · plan hash `ac2bba601b5f4ed161225d06b9d07be0311d2e532e1c27a84d903a51dff71e10`

## Summary

Round 2 review of the revised plan. All three R1 findings were accepted and are addressed in the revision. The "Premise evidence" section and Task 0 adequately mitigate the unverifiable vitana-v1 premises (R1-F2). The citation correction (R1-F3) is done. The evidence-file scope (R1-F1) is addressed in substance — `scopeCheck` at queue.mjs:1025 auto-exempts all files under `docs/validation/<VTID>/` via `own(f)`, so the lane scope need not even list them. One new minor finding about plan-text notation that could cause confusion when lane files are created.

## Findings

### R2-F1 [minor]

The plan's Lanes table describes the docs scope as a single brace-expansion glob `docs/validation/VTID-*/{acceptance.md,commands.log,scope.json,staging-tests.json,plan-sparring.md}`. The `globToRegex` function (queue.mjs:124) escapes `{` and `}` as literal regex characters; it does not support brace expansion. If the lane `.md` files are created with this single path entry (rather than 5 individual entries like crash-port.md uses for its 3), the glob will match nothing. Functionally this is harmless because `scopeCheck` line 1025 auto-exempts all files under `docs/validation/<VTID>/` via `own(f)`, but it is misleading in the plan text and could confuse the lane creator. The cited model (crash-port.md) lists docs paths individually, not as a brace set.

- `exafyltd/vitana-platform:scripts/collab/queue.mjs:113` — export function globToRegex(glob) {
  let re = '';
  const g = String(glob).trim();
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*' && g[i + 1] === '*') {
      i++;
      if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  if (re.endsWith('/.*')) re = `${re.slice(0, -3)}(?:/.*)?`;
  return new RegExp(`^${re}$`);
}
- `exafyltd/vitana-platform:scripts/collab/queue.mjs:1023` — const paths = asList(fm.paths);
const changed = git(repo, ['diff', '--name-only', `${base}...${head}`]).split('\n').filter(Boolean);
const own = (f) => f.startsWith(`.kiro/specs/${slug}/`) || (fm.vtid && f.startsWith(`docs/validation/${fm.vtid}/`));
if (paths.length === 0) {
  warnings.push(`lane ${key} declares no paths ...`);
} else {
  for (const f of changed) {
    if (own(f)) continue;
    if (!matchesAny(f, paths)) errors.push(`${f} is outside lane ${key} ...`);
- `exafyltd/vitana-platform:.kiro/specs/native-wave3-release-r2/lanes/crash-port.md:12` — paths:
  - apps/mobile/src/telemetry/**
  - apps/mobile/tests/telemetry/**
  - docs/validation/VTID-*/scope.json
  - docs/validation/VTID-*/staging-tests.json
  - docs/validation/VTID-*/plan-sparring.md
updated: 2026-11-08T12:07Z

Suggestion: In the plan text (and, more importantly, in the lane files that will be generated), list each docs/validation path as a separate entry — matching the crash-port.md convention — rather than using brace expansion. E.g.:
  - docs/validation/VTID-*/acceptance.md
  - docs/validation/VTID-*/commands.log
  - docs/validation/VTID-*/scope.json
  - docs/validation/VTID-*/staging-tests.json
  - docs/validation/VTID-*/plan-sparring.md
Alternatively, since own(f) auto-exempts all files under docs/validation/<VTID>/, the docs paths could be omitted entirely (crash-port omits acceptance.md and commands.log for the same reason).
