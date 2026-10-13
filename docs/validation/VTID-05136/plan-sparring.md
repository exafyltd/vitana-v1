# VTID-05136 — Plan sparring record

- Plan Sparring Gate: VTID-04868. Partner: `plan-sparring-partner` (independent, read-only).
- Change class: standard. Rounds: 2.
- Final plan hash: `e423f85f3300a81ed636cd4fef771dfd9f98dc7df954834a23478ffdad53b9fc`
- Verdict: **converged** (round 2).
- Owner approval: 2026-10-13 in session: "approved, process".

## Final plan

<!-- plan:begin -->
## Goal (owner, 2026-10-07)
"A supplier can register, accept terms, submit, be verified, add an offering through AI, and reach go-live readiness
without manual database intervention" — for the manual (web) path too, not only via the AI assistant (MCP). Owner asked
for this plan after seeing EXAFY's "Get ready to sell" screen show "Complete verification — Needs your attention"
although its verification is done (admin approval, level 1).

Change class: **standard** (frontend screen that triggers a lifecycle-changing write; i18n in all shipped locales).

## Current state (verified in code, 2026-10-07)
- `src/components/commerce/SetupHub.tsx` (VTID-04793) derives every row from a few facts:
  `deriveSetupSteps()` (~:59-75) sets the **verification row from `lifecycle_state` only** — needs_action/exception →
  "attention", submitted/verifying → "in review", live → done. It never reads the checklist's `verification` step, so an
  admin-approved org that is needs_action because of OTHER steps shows "verification needs your attention".
- The hub reads `GET /partner-onboarding/:orgId` (which already returns the full `checklist`: steps with status,
  missing, detail incl. `review_note`, `submit_ready`, `submit_missing`, `next_step`, `complete`) but uses only
  `organization`. It shows no open-step list and no reviewer note.
- **The web app has no submit action at all** (grep: no call to `/partner-onboarding/:orgId/submit` in `src/`). A manual
  supplier can fill everything in but cannot submit, and cannot resubmit after "request changes". Today only the MCP
  `submit_for_verification` tool (or an admin approval) moves the org.
- Gateway contract (exafyltd/vitana-platform, unchanged by this plan): `POST /api/v1/partner-onboarding/:orgId/submit`
  (requireAuth + org_admin) moves draft → submitted → verifying → live|needs_action or needs_action → verifying →
  live|needs_action; 409 `SUBMIT_PREREQUISITES_MISSING` {missing} or `NOT_SUBMITTABLE` {lifecycle_state}; 200 returns
  the org state + `transitions` + `open_steps`.
- Readiness % = done rows / 5 rows; Partner Terms is its own row below (VTID-04895).

## Change (vitana-v1 only; no gateway, API or DB change)
1. **Hub reads the checklist.** `load()` keeps its two reads and also keeps `ob.checklist`. `HubFacts` gains
   `checklist` (steps, submit_ready, submit_missing, complete). `deriveSetupSteps()` stays pure and exported:
   - verification row, first match wins: checklist `verification` step `done` → done; `failed` → attention; `todo`
     with `detail.review_note` → attention; step `in_progress` → in review; lifecycle submitted/verifying → in review;
     lifecycle `rejected` → attention (terminal; existing state text); otherwise todo. Falls back to today's lifecycle
     mapping only when the checklist is absent (e.g. a typeless org).
   - publish row unchanged (live → done).
2. **What is still open.** When the org is not live, the hub shows one short "Still needed" line listing the open
   required checklist steps in plain words (from a step-label map in i18n). Filter: required steps whose status is
   `todo` or `failed`; `done`, `in_progress` and `not_required` are never listed. The `complete_offering` missing code
   maps to one static i18n string ("one complete offering: title, price, link, origin country and where it is
   offered") — a label, not derived from the response.
3. **Reviewer's note.** If the verification step carries `detail.review_note.reason`, the verification row shows it
   ("Vitanaland asked: …") as plain text (React text node, no HTML).
4. **Submit / resubmit.** A primary button on the hub:
   - shown when lifecycle is `draft` or `needs_action` AND `checklist.submit_ready`; label "Submit for verification"
     (draft) or "Resubmit" (needs_action);
   - opens a small confirm dialog (what happens next; nothing is published while any offering is kept offline or
     incomplete) → `POST /:orgId/submit` via the existing `adminFetch`;
   - disabled while the request runs (no double submit); result shown inline: live → "You're live"; needs_action →
     the open steps from the response; any error (adminFetch throws on non-2xx with only the error code, so the 409
     body's `missing` list is not available) → a short "couldn't submit" message and `load()` refreshes the hub, whose
     fresh checklist then drives the "Still needed" line — the server's checklist stays the single source;
     `NOT_SUBMITTABLE` → the refreshed state text; shared `adminFetch` is not changed;
   - hidden for submitted/verifying/live/rejected/exception (they show their existing state text).
   When submit_ready is false the button is not shown; the "Still needed" line explains why.
5. **i18n.** New keys added to `src/i18n/de/` first (du-form), then `en`, and the other shipped locales
   (es, sr, ar, fr, pl, pt, ru, tr, zh) following the repo's existing pattern for this namespace (translations marked
   `_pending_review` where the repo does so). No hardcoded strings (ESLint i18n rules). RTL: logical classes only.
6. **No What's New card.** The feature is for supplier admins only; the What's New system has no audience
   targeting and its README skips admin-only work, so a community-wide "Brand New Feature" card would confuse members.
   If the post-merge drafter proposes one, its PR is closed with this reason.

## Tests
- **Vitest — rules:** `deriveSetupSteps` for: admin-approved + other steps open → verification done (the EXAFY case);
  failed → attention; review_note → attention; verifying → in review; live → all done; checklist missing → old lifecycle
  fallback. Open-step list excludes not_required and done steps; mapping/complete_offering wording.
- **Vitest — component, whole manual flow with a mocked `adminFetch` (no network, no DB):** draft org with profile,
  product and terms done → Submit shown → click → confirm → POST called once (second click while pending does nothing)
  → needs_action with open steps shown; after a request-changes response the note shows and "Resubmit" appears →
  resubmit → live → publish row done; a rejected submit (adminFetch throws) → "couldn't submit" message and the
  refreshed checklist's open steps; submit hidden for verifying/live/rejected/exception; verification step
  in_progress → "In review".
- **i18n:** existing locale parity / leak tests stay green; new keys present in every shipped locale.
- **Staging (read-only, existing VTID-04925 pattern):** Playwright spec that serves a demo business and checklist to the
  browser via route interception, opens the Commerce screen on staging, checks the verification row, the "Still
  needed" line and the Submit button render at 390 and 1280 widths, and asserts the button issues no request without
  confirmation — never confirms, never writes.
- Gateway unchanged → no gateway tests needed; the submit contract is already covered by
  `exafyltd/vitana-platform` `test/partner-onboarding.test.ts`.

## Files in scope (vitana-v1)
- src/components/commerce/SetupHub.tsx (+ a small SubmitDialog if it keeps SetupHub readable)
- src/components/commerce/SetupHub.test.ts (+ a new component test file)
- src/i18n/<locale>/screens.json (setupHub keys) for every shipped locale
- tests/e2e/staging/<vtid>-*.staging.spec.ts, docs/validation/<VTID>/, docs/SCREEN_INVENTORY.md (regenerated)

## Out of scope
Any gateway/API/DB change; letting suppliers allow listing of kept-offline offerings (admin-only by design); the
external-connector mapping UI; tracking/billing systems; jev/voice-budget page fixes (separate follow-up).
<!-- plan:end -->

## Round 1 — partner findings (verbatim)

## Verified premises

- **"deriveSetupSteps() (~:59-75) sets the verification row from lifecycle_state only"** → TRUE — `/home/user/vitana-v1/src/components/commerce/SetupHub.tsx:59-75`. The function checks only `f.lifecycleState` for the verification row; it never reads any backend checklist data.

- **"The hub reads GET /partner-onboarding/:orgId ... but uses only organization"** → TRUE — `/home/user/vitana-v1/src/components/commerce/SetupHub.tsx:142-152`. The `load()` callback fetches from the endpoint at line 143 but only destructures `ob?.organization?.country`, `website`, and `lifecycle_state`. The `checklist` property of the response (which the gateway does return — `/home/user/vitana-platform/services/gateway/src/routes/partner-onboarding.ts:201`) is ignored.

- **"The web app has no submit action at all (no call to /partner-onboarding/:orgId/submit in src/)"** → TRUE — Grep for `submit` in `/home/user/vitana-v1/src/` returns zero hits related to the partner-onboarding submit endpoint. The gateway endpoint exists at `/home/user/vitana-platform/services/gateway/src/routes/partner-onboarding.ts:396-403`, but nothing in the frontend calls it.

- **"POST /:orgId/submit ... 409 SUBMIT_PREREQUISITES_MISSING {missing} or NOT_SUBMITTABLE {lifecycle_state}; 200 returns the org state + transitions + open_steps"** → TRUE — `/home/user/vitana-platform/services/gateway/src/services/partner-onboarding-service.ts:415-416` (409 SUBMIT_PREREQUISITES_MISSING with `missing` and `checklist`), line 421 (409 NOT_SUBMITTABLE with `lifecycle_state`), line 443 (200 with `transitions` and `open_steps`). The response also includes `organization` and `checklist` via `orgState()` at line 118.

- **"review_note in the verification step detail"** → TRUE — `/home/user/vitana-platform/services/gateway/src/services/partner-review.ts:265-266` writes verification step status `'todo'` with `detail.review_note: { reason, requested_by, requested_at }` when admin requests changes.

- **"Readiness % = done rows / 5 rows"** → TRUE — `/home/user/vitana-v1/src/components/commerce/SetupHub.tsx:77-79`, `readinessPercent()` divides done count by `steps.length` (5 steps defined at lines 68-75).

## Findings

**F1 [major] adminFetch throws on non-2xx and loses the structured error body — 409 missing items will be inaccessible**

Evidence: `/home/user/vitana-v1/src/lib/admin-api.ts:44-48`. When `!res.ok`, `adminFetch` extracts only `body?.error || body?.message` into a plain `Error(msg)` string and throws. The plan says on 409 SUBMIT_PREREQUISITES_MISSING the UI should show "the missing items in plain words" — but `adminFetch` discards the `missing` array and the `checklist` object from the 409 body before the caller ever sees them. The caller's `catch` block only gets `error.message === 'SUBMIT_PREREQUISITES_MISSING'`.

Suggestion: Either (a) use a raw `fetch` for the submit call that preserves the full response body on 409, or (b) create a thin wrapper (e.g. `adminFetchRaw`) that returns `{ ok, status, body }` without throwing on 4xx, or (c) since the hub already holds the local `checklist` (per the plan's own step 1), fall back to displaying missing items from the local checklist state on any submit error, and document that the 409 body detail is intentionally unused. Option (c) is simplest and avoids touching shared code.

**F2 [major] The plan's proposed verification-row mapping has a gap: the backend step status `in_progress` is not covered**

Evidence: `/home/user/vitana-platform/services/gateway/src/services/partner-onboarding-checklist.ts:35` defines `STEP_STATUSES = ['todo', 'in_progress', 'done', 'failed', 'not_required']`. The plan's proposed mapping covers `done`, `failed`, and `todo` (with/without review_note), then falls through to lifecycle for submitted/verifying, and "otherwise todo". But a verification step with status `in_progress` (e.g. an automated check that's running) is not explicitly handled — it would fall to "otherwise todo", which would show as "To do" when it should show as "In review" or "In progress".

Suggestion: Add `in_progress` to the mapping explicitly (map to the hub's `in_progress` state, i.e. "In review").

**F3 [minor] The plan lists `not_required` as excluded from the "Still needed" line but does not mention `in_progress` as excluded**

Evidence: The plan says "Steps marked not_required are never shown" in the open-step list. It should also clarify that `done` and `in_progress` are excluded, and specify whether `failed` is shown (it should be, as it represents something needing attention).

Suggestion: Clarify the "Still needed" line filter: show steps where `status` is `todo` or `failed`, exclude `done`, `in_progress`, and `not_required`.

**F4 [minor] The plan claims the hub will show missing items as "one complete offering: title, price, link, origin country and where it is offered" from i18n — but the backend `missing` codes are machine-readable step keys, not offering-field-level granularity**

Evidence: `/home/user/vitana-platform/services/gateway/src/services/partner-onboarding-checklist.ts:245`: the mapping step emits `missing: ['complete_offering']` (a single code). The `isCompleteOffering()` function at lines 140-147 checks `title`, `price_eur`, `purchase_url`, `origin_country`, and `ships_to_countries/regions` — but these field names are internal to the function and not returned in the `missing` array. The plan's i18n label "one complete offering: title, price, link, origin country and where it is offered" is a fine human-readable description but should be the i18n value for the `complete_offering` code, not derived from the response.

Suggestion: Confirm this is the intended design — map `complete_offering` to a single i18n string that describes all the fields. This is fine as-is; just ensure it's clear this is a static label, not dynamically derived from the response.

**F5 [minor] No explicit handling for the `rejected` or `exception` lifecycle states in the submit button visibility**

Evidence: The plan says "hidden for submitted/verifying/live/rejected/exception (rejected/exception show the existing state text)". The current `deriveSetupSteps` maps `needs_action` and `exception` to `attention`. If the org is in `rejected` state, it is not in the explicit list in the current code — it would fall to the `todo` branch. The plan should clarify what lifecycle_state `rejected` maps to, since it affects both the verification row display and the submit button visibility.

Suggestion: Add `rejected` to the verification row mapping (probably `attention`) and confirm the submit button is hidden for it.

**F6 [minor] The What's New entry should only target supplier/partner roles, not the entire community**

Evidence: The CLAUDE.md What's New system (`/home/user/vitana-v1/CLAUDE.md`, "What's New cards" section) says entries become "Brand New Feature" News Feed cards + push for all users. This feature — submit/resubmit for verification — is only relevant to suppliers/partner org admins, not the general community. A News Feed card saying "suppliers can now submit for verification from the web" would be confusing to regular community members.

Suggestion: Check whether the What's New entry system supports role/audience targeting. If not, consider whether this change truly warrants a What's New card (it could be argued this is an admin/supplier-only workflow fix, not a user-facing feature for the community). The CLAUDE.md rule says "skip for fixes/refactors/admin-only work" — this is arguably admin/supplier-only work.

## Questions for the planner

1. **F1 — adminFetch error handling:** Which approach do you prefer for handling the 409 response body? Using the local checklist state (option c) seems simplest — the hub already has it after step 1 of the plan. Is that acceptable, or do you need the actual server-side `missing` from the 409 body?

2. **F6 — What's New targeting:** Is the What's New entry intended for all community members, or only suppliers? The CLAUDE.md exception for "admin-only work" could apply here. Does the What's New system support audience scoping?

3. **Lifecycle state `rejected`:** Does the `rejected` state exist in practice for partner organizations? The plan handles `draft`, `needs_action`, `submitted`, `verifying`, `live`, and `exception` but only mentions `rejected` in the "hidden" list for the submit button. What should the verification row show for a rejected org?

## Verdict

**NOT CONVERGED** — F1 (adminFetch discards structured 409 body) and F2 (missing `in_progress` step status in the verification mapping) are both major findings that need resolution before implementation. F1 affects a core user flow (seeing why submission failed); F2 can show a misleading status. Both have straightforward fixes.

## Round 1 — planner responses
- F1 ACCEPTED — option (c): shared adminFetch untouched; on any submit error the hub shows a short message and reloads, and the refreshed checklist drives the "Still needed" line. Test updated.
- F2 ACCEPTED — verification step `in_progress` → "In review" (explicit in the mapping and tested).
- F3 ACCEPTED — "Still needed" lists required steps in `todo` or `failed` only.
- F4 ACKNOWLEDGED — `complete_offering` maps to one static i18n label; stated in the plan.
- F5 ACCEPTED — `rejected` → attention on the verification row (existing state text), no submit button.
- F6 ACCEPTED — no What's New card (supplier-admin-only, no audience targeting; README skips admin-only work).

## Round 2 — partner re-review (verbatim)

## Round 1 findings — disposition

- **F1 [major] adminFetch loses 409 body** → **closed**. Plan revised (lines 50-53): on any submit error, hub shows a short message and calls `load()`, whose fresh checklist drives the "Still needed" line. Shared `adminFetch` untouched. Test updated (line 70-71). Sound design: the server's checklist is the single source of truth regardless.

- **F2 [major] verification step `in_progress` not mapped** → **closed**. Plan revised (line 33): `in_progress` explicitly maps to "In review". Test added (line 72).

- **F3 [minor] "Still needed" filter incomplete** → **closed**. Plan revised (lines 38-39): filter spelled out as "required steps whose status is `todo` or `failed`; `done`, `in_progress` and `not_required` are never listed."

- **F4 [minor] complete_offering label** → **acknowledged**. Plan now explicitly states (lines 40-41): "a label, not derived from the response."

- **F5 [minor] `rejected` lifecycle not handled** → **closed**. Plan revised (line 34): `rejected` maps to `attention` on the verification row; submit button hidden for it (line 54). Verified: `rejected` is a valid terminal lifecycle state (`/home/user/vitana-platform/services/gateway/src/services/partner-lifecycle.ts:33,48,60`), and `submitTransitions()` returns `null` for it (line 327), confirming no submit is possible.

- **F6 [minor] What's New card for supplier-only work** → **closed**. Plan revised (lines 59-61): no What's New card. Verified: the What's New README (`/home/user/vitana-v1/src/whats-new/README.md:23-24`) confirms "admin-only changes are skipped without a model call."

## New findings

None. The revisions are clean and internally consistent. Verification mapping now covers all 5 `StepStatus` values (`todo`, `in_progress`, `done`, `failed`, `not_required`). The submit flow correctly targets only `draft` and `needs_action` states, matching `submitTransitions()` at `/home/user/vitana-platform/services/gateway/src/services/partner-onboarding-checklist.ts:310-328`. The error-handling approach (reload + checklist-driven display) avoids touching shared code while still giving the user accurate information.

## Questions for the planner

None.

## Verdict

**CONVERGED** — all 6 findings from round 1 are closed or acknowledged with satisfactory resolutions. No new blockers or majors. The plan is consistent with the codebase, respects the governance rules (frontend-only, read-only staging tests, i18n-first, no production writes), and the test plan covers the key behaviors including the newly added edge cases.
