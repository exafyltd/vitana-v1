# VTID-05129 — plan sparring record

- Partner: plan-sparring-partner (independent, read-only)
- Rounds: 2 — round 1 NOT CONVERGED (3 major, 4 minor, 3 questions), round 2 CONVERGED
- Plan hash (sha256 of the text between the plan markers): `93093e0bec2f2eb69c157b06d82cc162dc4418b82f7b16db2bca766ebac2b31a`
- Owner approval: "Yes" in the Claude Code session, 2026-10-13 (Gate 1)

## Round 1 findings (partner)

- F1 [minor] summarizeFailure line numbers wrong (run.mjs:252-256).
- F2 [major] DEFAULT_ALLOWED_ABORTS large and broad (e.g. `api/v1/orb/`); risk of masking real write regressions. Narrow each pattern, justify each entry, cap the list, consider mocking health_compute_vitana_index.
- F3 [major] VTID-04973 fix as worded would be a no-op: measureFeed already descends one display:contents level; feed items have two nested layers (Home.tsx:442 + withCardId.tsx:105). Use a loop.
- F4 [major] one VTID across two repos without a merge order; a full run between merges is ambiguous.
- F5 [minor] retry every fetch throw would also retry TLS/DNS errors; limit to transient network codes.
- F6 [minor] VTID-04793 fallback testid choice unspecified; use one combined visible locator.
- F7 [minor] decide whether helpers live in lib.cjs or run.mjs.
- Q1 does health_compute_vitana_index write production? Q2 merge order? Q3 are all 16 failures covered?
- Verdict: NOT CONVERGED (F2, F3, F4).

## Round 2 (partner)

F1–F7 closed; Q1–Q3 answered; no new blocker or major. Verdict: CONVERGED.

## Final plan and planner responses

# Plan — make the community-app FULL STAGING-VERIFY run green

<!-- plan:begin -->
## Why
Owner decision 2026-10-13: no production release until a full staging run is green. The latest
full run (38295808979, community-app @ bcae4d0a) failed 16 suites; 13 of them also failed in
the morning full run before that day's merges. Read-only diagnosis (vitana-platform 3e92313e,
vitana-v1 origin/main) found every failure is a test/runner defect, none a product bug.

## Diagnosis → fix (by group)

### A. Runner (vitana-platform `scripts/ci/staging-verify/`)
1. `deploy: staging still serves the commit after the run` — `run.mjs:114-122` `confirmLive`
   pushes `null` when a stamp fetch throws; `stamps.every(commitMatches)` then fails, with one
   attempt only (`run.mjs:334`). The message shows the first non-null stamp (`bcae4d0af10b`,
   the right commit). Fix: a null sample is "unknown", not a mismatch — pass when at least one
   stamp is non-null and every non-null stamp matches; fail on any different stamp or all-null;
   after-run check gets `attempts: 3`; problem text lists all samples.
2. VTID-04989 `the page loads the boot recovery script` → `fetch failed` (Node fetch network
   error; same host/path returned the page to other checks in the run). Fix: `httpGet`
   (`run.mjs:60-82`) retries GET/HEAD up to 2 times with short backoff only when fetch throws a
   transient network error (`TypeError` whose `cause.code` is one of ECONNRESET, ECONNREFUSED,
   ETIMEDOUT, EAI_AGAIN, UND_ERR_SOCKET, UND_ERR_CONNECT_TIMEOUT) — never on an HTTP status, never
   on TLS/cert errors, never for non-GET probes.
3. Failure summaries drop the guard's blocked-URL lines (`summarizeFailure`, `run.mjs:252-256`,
   keeps only `Error:|✘|expect`). Fix: also keep lines that start with an HTTP method + URL
   following a "staging-guard aborted" line (cap 20), so OASIS/PR evidence names the requests.

### B. Staging guard (vitana-platform `scripts/ci/staging-verify/staging-guard.ts`)
4. App-wide read-shaped POSTs abort and fail specs that only allow some of them
   (VTID-04682 calendar connect, VTID-04760..04763 Audiobook, VTID-04795, VTID-04796, VTID-04827).
   Fix: a shared `DEFAULT_ALLOWED_ABORTS` list merged with each spec's `allowAbortedWrites`
   (`:96-98`). Every entry is an exact, anchored path (no prefix wildcards) with a one-line
   reason in code:
   - telemetry: gateway `api/v1/rum/beacon`, `api/v1/diag/notif-tap`, `api/v1/analytics/events/batch`;
   - presence/activity logs: `rest/v1/thread_presence`, `rest/v1/user_activity_log`;
   - read-only RPCs (POST only because supabase-js sends rpc as POST): `rpc/get_role_preference`,
     `rpc/get_my_permitted_roles`, `rpc/list_roles_for_active_tenant`,
     `rpc/get_profile_health_summary`, `rpc/get_user_profile_by_identifier`,
     `functions/v1/list_my_memberships`;
   - real production writes that fire app-wide on load and are not the subject of any spec:
     `rpc/health_compute_vitana_index` (daily Vitana Index upsert) and
     `functions/v1/generate-daily-matches` (creates match rows) — the guard correctly aborts
     them; we only tolerate that abort;
   - voice widget prewarm: exactly `api/v1/orb/live/session/prewarm` (the only orb call on load,
     `useOrbVoiceWidget.ts:45`; 29 specs already allow exactly this path) — not `api/v1/orb/`.
   These requests STAY ABORTED — nothing new reaches production data. Specs may still add their
   own entries. Unit tests pin: the exact list (snapshot + a hard cap of 16 entries, so growth
   needs a deliberate test change), that each listed request is tolerated, and that an unlisted
   write (e.g. `POST rest/v1/profile_posts`, `POST api/v1/orb/live/session/start`) still fails.
   Audiobook additionally tolerates `rest/v1/daily_matches` (MatchesPreview's viewed_at PATCH
   on /autopilot — not that spec's subject; stays aborted).

### C. Specs / manifests (vitana-v1)
5. VTID-04658, VTID-04723 `http /` expect superseded `orb-widget.js?v=…` strings (current:
   `20261002-vtid-04843-widget-rebust`, owned by VTID-04843's suite). Fix: make their `/` body
   check version-agnostic (`/command-hub/orb-widget.js?v=`); their pinned-URL fetch checks stay.
6. VTID-04675/04676 notification settings: spec asserts `live_rooms` is NOT offered; staging data
   now has a live-room type switched on (Admin › Notifications; no code change). Product correct
   (spec line 58 invariant holds). Fix: drop the hard-coded `live_rooms` absence asserts (lines
   57, 70); assert data-driven instead: every offered category has ≥1 switched-on type and is
   rendered.
7. VTID-04793 commerce register: first visit now opens the AI/MCP connect sheet (VTID-04839/04848,
   owner decisions 2026-10-02); registration opens via the manual fallback. Fix: click the visible
   manual fallback before step 1 and after the reload, both desktop and 375px tests, via one
   locator `[data-testid="mcp-register-manually"], [data-testid="ai-prefer-manual"],
   [data-testid="hero-manual"]` filtered to visible, `.first()`, with a comment: which sheet opens
   first depends on the MCP/AI flags (`CommercePortal.tsx:189-200`).
8. VTID-04795: the amber "in development" badge is hidden when AI setup is on (VTID-04839,
   `SetupChooser.tsx:87`). Fix: assert the badge matches the AI setting (0 when on), not 1.
9. VTID-04796: `business-context` matches 2 elements during the chooser's close animation. Fix:
   wait for the chooser to be gone / scope to the open dialog.
10. VTID-04827 Matches viewed: with the profile RPC aborted every match card is dropped
   (`useRealMatches.ts:100-104`), so the viewed_at write can never be proven. Fix: the spec
   answers `rpc/get_user_profile_by_identifier` itself with a stub profile via `page.route`
   (read-only, as VTID-04795 does) so cards render and the PATCH is attempted (and aborted).
11. VTID-04973 feed order: `measureFeed` treats `display: contents` article wrappers
   (`withCardId`) as 0×0, dropping every article, so info,article,info reads as info,info. Fix:
   replace the existing single-level ternary (`spec:53`, which descends ONE `display: contents`
   level) with a loop: `let box = el; while (box && getComputedStyle(box).display === 'contents')
   box = box.firstElementChild;` — feed items have TWO nested `display: contents` layers
   (`Home.tsx:442` wrapper + `withCardId.tsx:105`). No product change.

## Coverage of all 16 failing suites (run 38295808979)
deploy → A1; VTID-04989 → A2; VTID-04658, 04723 → C5; VTID-04675, 04676 → C6; VTID-04793 → C7;
VTID-04795 → C8 + B4; VTID-04796 → C9 + B4; VTID-04682 → B4; VTID-04760..04763 → B4;
VTID-04827 → C10 + B4; VTID-04973 → C11. Intermittent in the earlier full run 38292425343:
VTID-04965 (guard abort) → B4; VTID-05066 phone journey (perf budget, passed in the later run) —
not changed; if it fails in the proof run it is fixed forward as its own finding.

## Merge order (one VTID, two PRs)
1. vitana-platform PR (runner A1–A3 + guard B4) merges first; the runner is used straight from
   vitana-platform main by every STAGING-VERIFY run, no deploy needed.
2. vitana-v1 PR (C5–C11) merges second; its staging deploy triggers a change run.
3. Only then dispatch the full proof run. A full run between the two merges is not used as
   evidence. Either PR alone makes no suite worse (runner fixes only remove false failures;
   spec fixes don't depend on the guard list except via B4, which is additive).

## Not changed
No product code, no migrations, no gateway code, no staging data. No test is skipped, disabled,
quarantined or loosened beyond replacing assertions that encode superseded behaviour (5–8) with
ones that encode current behaviour.

## Verification
- vitana-platform: unit tests for `confirmLive` (null sample, mismatch, all-null), `httpGet` retry
  (throws then succeeds; status never retried; POST never retried), `summarizeFailure` keeps
  blocked URLs, guard default list (listed abort tolerated, unlisted write still fails). Repo's
  CI gates (validator evidence pack, staging-tests.json).
- vitana-v1: specs typecheck/lint; each changed spec run locally against staging is NOT allowed
  to write — staging specs are read-only by construction and the guard stays on; they run in CI.
- Proof: merge both, then dispatch STAGING-VERIFY community-app full=true on the commit staging
  serves; target 0 failures. Fix forward up to 3 attempts per failure. Then Gate 2 with the full
  green run + the change runs, listing every commit since production.

## Change class / scope
standard. Repos/files: vitana-platform `scripts/ci/staging-verify/run.mjs` (wiring),
`lib.cjs` (pure helpers: stamp-sample evaluation, retriable-error check, failure-summary filter —
unit-tested there, as the existing lib helpers are), `staging-guard.ts`, their tests, `docs/validation/<VTID>/*`; vitana-v1
`docs/validation/VTID-04658|04723/staging-tests.json`, `tests/e2e/staging/vtid-04676-…`,
`vtid-04793-…`, `vtid-04795-…`, `vtid-04796-…`, `vtid-04827-…`, `vtid-04761-…`, `vtid-04973-…`
spec files, `docs/validation/<VTID>/*`. One VTID across both repos.
<!-- plan:end -->

## Planner responses — round 1
- F1 [minor] line numbers — ACCEPTED: summarizeFailure is `run.mjs:252-256`; guard merge `:96-98`.
- F2 [major] broad default list — ACCEPTED: every entry exact and anchored with a reason; orb is
  exactly `api/v1/orb/live/session/prewarm`; the two real writes are named as production writes
  whose abort we tolerate (Q1); hard cap 16 + snapshot test + unlisted writes still fail.
  `health_compute_vitana_index` is not mocked: it fires app-wide from VitanaIndexProvider, so a
  stub in every spec would be the same tolerance spread over 30 files.
- F3 [major] 04973 no-op risk — ACCEPTED: plan now names the loop replacing the single-level ternary.
- F4 [major] cross-repo order — ACCEPTED: merge order section; proof run only after both merge;
  one VTID kept because it is one outcome (green full run) — two PRs, documented order.
- F5 [minor] retry scope — ACCEPTED: retry only TypeError with the listed transient cause codes.
- F6 [minor] 04793 locator — ACCEPTED: single combined visible locator with comment.
- F7 [minor] lib.cjs vs run.mjs — ACCEPTED: pure helpers in lib.cjs (unit-tested), wiring in run.mjs.
- Q1 — answered in F2: yes, it upserts in production Supabase; the guard aborts it; we tolerate.
- Q2 — answered in Merge order.
- Q3 — all 16 are covered; see Coverage (13 pre-existing, VTID-04973 data-dependent since 10/11,
  VTID-04682/04827 intermittent guard aborts).


---

# Amendment A1 — phone journey judged on the median of 3 passes

Owner decision 2026-10-13 (in session): "Median + merge pause". Sparred with the plan-sparring-partner, 2 rounds, verdict **CONVERGED** (no open blocker or major). Plan hash (sha256 of the text between the markers): `b70925f930c11d12d43530b1e7e82b8e7ea38488f44d17bd66a3b4253c3b0214`.

# VTID-05129 amendment A1 — phone journey judged on the median of 3 passes

<!-- plan:begin -->
## Why
Owner decision 2026-10-13 (chose "median + merge pause"): the community-app full STAGING-VERIFY run must be green
before production. After VTID-05129's fixes every original failure passes; the remaining red is the phone journey
(`tests/e2e/staging/screen-journey.staging.spec.ts`, referenced by the smoke suite and the VTID-05062 / VTID-05066 /
VTID-05081 manifests). In each of three full runs one of the ~4 journey executions missed one timing budget by
1–11 %, a different step each time:
- run 38363989362: Events first visit timed out at 10 s waiting on one live-room cover image (3 other journeys ~1 s);
- run 38372005093: Postfach first 4454 / 4354 ms vs 4000 (the same step read 3262 / 2006 ms in the other journeys);
- run 38376258040: News return 1518 ms vs 1500 (other journeys 1242 / 1250 / 1030 ms).
A single sample on a shared CI runner with 4x CPU throttle has more spread than the budget margin.

## Change (vitana-v1, one spec file)
1. The journey body (cold `/home` load + the 5 tab taps) becomes `runPass(passNo)` returning its rows; the test runs
   3 passes on the SAME guarded `page` (the staging guard is a `page` fixture; a new context would be unguarded —
   never used). Sign-in, CDP throttling (4x CPU, Fast 4G) and the ORB-widget abort stay as today, set once.
2. Between passes: `localStorage.clear()`, `sessionStorage.clear()`, Cache Storage cleared, the three auth keys
   written back from the same session object; the in-test image cache is reset (new `reset()` clears entries,
   `everLoaded` and the step counters); then the cold `/home` load. Pass 2 and 3 therefore start as cold as pass 1
   (Playwright already disables the browser HTTP cache because routes exist — header comment of the spec).
3. Verdict per journey step (same step index across passes):
   - timing: the MEDIAN of the three `ready_ms` (a timed-out sample counts as `CAP_MS`) must be ≤ the unchanged
     budget (first 4000 ms, return 1500 ms); a median at `CAP_MS` reads "not ready within 10000 ms";
   - photo re-download on a return step and media frame-height change: still fail if they happen in ANY pass
     (deterministic properties, not timing noise);
   - every failure line names all three samples, and the slow samples keep their diagnostics (network summary,
     timeline, CPU profile) as today.
4. `console.table` prints every pass plus a median row per step; the JSON attachment carries all passes.
5. `test.setTimeout` 5 → 12 min (3 passes ~40 s each plus sign-in, within the runner's 15-min per-spec limit). The
   spec runs 4 times per full run (smoke + VTID-05062/05066/05081), so a full run grows ~5.5 min: the three cited
   runs' verify steps took 45 / 45 / 45 min → ~51 min, within the 75-min job timeout from fix-forward 1.
6. `runPass()` starts with `downloads = []` (sparring F4).

Budgets, the device profile, the journey order and the read-only guarantees do not change. What changes on purpose:
one slow sample out of three no longer fails a step; two out of three still do. This is stated in the spec header
and in the PR.

## Merge pause (owner action, not code)
The owner pauses vitana-v1 merges for ~50 minutes while the final full run executes on the commit staging serves
(the after-run deploy check failed in all three runs because main moved mid-run). The session tells the owner when
the window starts and ends.

## Verification
- The spec typechecks (strict tsc with the guard present) and `playwright test --list` loads it.
- No write path is added: same page, same guard, same allowAbortedWrites.
- Proof: full STAGING-VERIFY community-app run during the merge pause, target 0 failures; then Gate 2.

## Change class / scope
light — one spec file (`tests/e2e/staging/screen-journey.staging.spec.ts`) plus
`docs/validation/VTID-05129/{plan-sparring.md,README.md}` in vitana-v1. No product code, no workflow, no migration.
<!-- plan:end -->

## Planner responses — round 1
- F1 [minor] spec timeout vs config 90 s — ACKNOWLEDGED, no change (spec-level `test.setTimeout` wins).
- F2 [major] wall time vs 75-min job timeout — ACCEPTED with evidence: the verify step of the three cited full runs
  took 45 min (07:45:22→08:30:15, cancelled at the old 45-min cap during the final deploy check), 45 min
  (≈08:52→09:36:49) and 45 min (09:37→10:21:56). +4 executions × ~80 s ≈ +5.5 min → ~51 min, 24 min below the 75-min
  cap. Plan text updated with these figures.
- F3 [minor] reset vs response listener / WeakSet — ACKNOWLEDGED, no change (benign, as you concluded).
- F4 [minor] `downloads` not reset per pass — ACCEPTED: `runPass()` starts with `downloads = []`.
- F5 [minor] init script re-runs, orphaned long-task observer — ACKNOWLEDGED, no change (reassignment handles it).
- F6 [minor] profiler state — ACKNOWLEDGED, no change.
- F7 [minor] table size — ACKNOWLEDGED: 24 rows; the JSON attachment carries all passes.
- Q1 — answered in F2 (45 / 45 / 45 min).
- Q2 (3 passes only in the smoke execution) — REJECTED: the VTID-05062/05066/05081 manifests run the same spec file
  with the same budgets; a single-pass execution there would keep flapping exactly as in runs 1–3 (run 2's two
  failures were the VTID-05062 and VTID-05081 executions). One behaviour for every execution, no env switch.


## Partner — round 1 (summary)
F1 minor (spec timeout vs config 90 s — no issue); F2 major (full-run wall time vs 75-min job timeout — asked for observed durations); F3 minor (image reset vs response listener — benign); F4 minor (reset `downloads` per pass); F5 minor (init script re-run — benign); F6 minor (profiler state — fine); F7 minor (table size); Q1 durations; Q2 three passes only in smoke? Verdict: NOT CONVERGED pending F2.

## Partner — round 2
F1–F7 closed; Q2 rejection acknowledged; no new blocker or major. Verdict: **CONVERGED**.
