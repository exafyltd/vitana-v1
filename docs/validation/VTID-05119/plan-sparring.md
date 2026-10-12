# VTID-05119 — plan sparring record (FU3: fetch-user-context empty body + caller context shape)

# Personalised event/group recommendations get no member context: `fetch-user-context` 500s on the bodyless call, and the caller reads the wrong shape

change class: standard
(7 files, no migration. It touches the request handler that holds the VTID-05049 caller-auth gate. Shipping it means two production edge-function deploys, and those deploys carry merged commits that are not live yet: VTID-05049 and VTID-05023. See Rollout.)

scope: exafyltd/vitana-v1 only, revision 2 (after sparring round 1). Files:
- `supabase/functions/fetch-user-context/index.ts`: the handler's body parse only.
- `supabase/functions/_shared/read-json-body.ts`: new. A strict parser, pure, no imports.
- `supabase/functions/generate-enhanced-recommendations/index.ts`: lines 39–40 and 96–100.
- `supabase/functions/_shared/recommendation-matches.ts`: a new pure export for the context mapping. This helper is already imported by Vitest and is used only by `generate-enhanced-recommendations`.
- `src/lib/read-json-body.test.ts`: new.
- `src/lib/recommendation-matches.test.ts`: extended.
- `src/lib/edge-functions-caller-identity.s4.test.ts`: extended.

vitana-platform: no change. `git grep fetch-user-context origin/main` over vitana-platform has no hits.

<!-- plan:begin -->

## User-visible result

When a member asks for event or group recommendations (`src/hooks/useEventRecommendations.ts:67` → `generate-enhanced-recommendations`), the Claude scoring prompt gets three of the member's own signals. Today it gets "None" / "Not specified" for every field:
- their community interests
- their location
- up to 3 recent diary entries

As a result, matches and reasons ("matches interest: yoga", "near your location") are based on the member's real context instead of nothing.

"Goals" is mapped too, but `fetch-user-context` currently always returns `health.goals: []` (`fetch-user-context/index.ts:533`). That line will keep reading "None" until a goals source exists, and this plan does not add one.

## Problem

Evidence is from vitana-v1 `origin/main` at `bcae4d0a` (2026-10-12).

1. **The callee needs a JSON body.**
   - `supabase/functions/fetch-user-context/index.ts:658` reads `const body = await req.json();` with no guard. Lines 659–660 read `body.userId` and `body.forceRefresh`.
   - An empty request body throws `SyntaxError: Unexpected end of JSON input`. The catch at `:678-686` returns that as **HTTP 500**.
   - The throw happens before `requireUser` (`:670`), so a valid member JWT still gets a 500.
2. **The only caller sends no body and ignores the error.**
   - `supabase/functions/generate-enhanced-recommendations/index.ts:39` calls `supabaseClient.functions.invoke('fetch-user-context')` with no `body`. supabase-js sends a POST with an empty body.
   - `:40` (`const userContext = contextData || {}`) never looks at `error`, so the 500 is swallowed and nothing is logged.
3. **The caller reads a shape the callee never returns.** This is sparring finding F2.
   - The callee answers `{ context, cached, cacheType }` (`fetch-user-context/index.ts:697-702`, `:729-735`, and the fresh path that follows `:742`).
   - The caller reads these top-level fields, none of which exist:
     - `userContext.interests[].interest` (`generate-enhanced-recommendations/index.ts:97`)
     - `.goals[].primary_goal` (`:98`)
     - `.profile.location` (`:99`)
     - `.recentDiaryEntries[].text` (`:100`)
   - The real fields are:
     - `context.community.userInterests: string[]` (`fetch-user-context/index.ts:148`, filled `:631`)
     - `context.community.userLocation?: string` (`:149`, `:632`)
     - `context.health.recentDiaryEntries[].text` (`:68-73`, `:527-532`)
     - `context.health.goals: string[]` (`:74`, always `[]` at `:533`)
   - So fixing the 500 alone changes nothing the user sees.
4. **No other callers.** In vitana-v1 the only call site is the one in item 2. The other hits are `supabase/config.toml:63`, docs and guard tests. vitana-platform has no reference at all. The frontend reaches this path only through `useEventRecommendations.ts:67`.
5. **The 500 is old.** The pre-VTID-05049 source (`6e7ada24^`, `:657`) has the same unguarded `await req.json()`. It was not introduced by VTID-05049.
6. **Deployed state (read-only `list_edge_functions`, 2026-10-12).**
   - `fetch-user-context` is v345, `verify_jwt=true`, `updated_at` 2026-10-09 18:36 UTC (the VTID-05008 redeploy).
   - `generate-enhanced-recommendations` is v284, `verify_jwt=true`, `updated_at` 2026-10-07 11:36 UTC.
   - Merged since those deploys, and touching one or both functions or their `_shared` imports:
     - `64f36ff5` VTID-05023 (Aurora data client, 2026-10-10 10:00 UTC): both functions.
     - `6e7ada24` VTID-05049 (caller-auth, 2026-10-10 11:19 UTC): `fetch-user-context` only.
   - `get_edge_function` returned an MCP internal error, so I could not diff the deployed source byte for byte. Both candidate sources (pre-05049 and `origin/main`) have the unguarded parse.
7. **Logs.** `query_logs` over `function_edge_logs` and `function_logs` has no rows for either function, both in the last 24 h and in 2026-10-09 18:00 – 2026-10-10 18:00 UTC. The feature gets little traffic, so the 500 is confirmed from the code only.

## Fix

1. **Strict parser: `supabase/functions/_shared/read-json-body.ts`** (new, pure, no imports; sparring F1).
   - Signature: `export async function readJsonBody(req: Request): Promise<{ kind: 'json'; value: Record<string, unknown> } | { kind: 'empty' } | { kind: 'invalid' }>`.
   - It reads `await req.text()`.
   - A zero-length or whitespace-only body returns `{ kind: 'empty' }`.
   - A JSON object returns `{ kind: 'json', value }`.
   - Anything else returns `{ kind: 'invalid' }`: malformed JSON, or valid JSON that is not a plain object (array, string, number, `null`).
   - It never substitutes a default. Any lenience is the caller's own, visible decision.
2. **`fetch-user-context/index.ts:657-660`** replaces `const body = await req.json();` with the parser, and keeps the lenience at the call site with a comment:
   ```ts
   const parsed = await readJsonBody(req);
   if (parsed.kind === 'invalid') return badRequest('Invalid JSON body');   // 400 + CORS headers
   // An empty body is a valid request: "my own context". The only caller,
   // generate-enhanced-recommendations, sends none. The user then comes from the JWT below.
   const body = parsed.kind === 'json' ? parsed.value : {};
   const userId = typeof body.userId === 'string' ? body.userId : undefined;
   const forceRefresh = body.forceRefresh === true;
   ```
   - The rest of the handler is byte-identical.
   - VTID-05049 auth semantics are unchanged:
     - A body `userId` counts only when `isServiceRoleCaller(req)` is true (`:665`).
     - Everyone else goes through `requireUser`, which takes the verified JWT (`:670-671`).
     - A different body id gets 403 (`:672-674`).
     - With no body, `userId` is undefined and the member gets their own JWT context (`:676`).
   - The strings matched by the existing VTID-05049 guard regexes stay unchanged.
3. **The caller mapping, as a pure, testable export in `_shared/recommendation-matches.ts`:**
   - Signature: `export function recommendationContextLines(contextResponse: unknown): { interests: string; goals: string; location: string; recentActivities: string }`.
   - It reads `contextResponse?.context`, defensively, with every level optional:
     - `community.userInterests` is joined with `, `; default `'None'`.
     - `health.goals` (strings) is joined with `, `; default `'None'`.
     - `community.userLocation` is used as is; default `'Not specified'`.
     - `health.recentDiaryEntries`: the first 3, each `text` sliced to 100 characters, joined with `; `; default `'None'`.
   - Non-string items are skipped, and a missing or garbled response yields the defaults. This matches today's output when context is absent.
   - The fallback words stay the same English prompt labels as today. They are model input, not speech: the prompt is localised by `buildLocalizedSystemPrompt`.
4. **`generate-enhanced-recommendations/index.ts`.**
   - At `:39-40`, take `{ data: contextData, error: contextError }`. If there is an error, log it with `console.warn('[enhanced-recommendations] fetch-user-context failed', contextError?.message)` and continue with no context. Continuing is the current behaviour, but it is now logged instead of silent (CLAUDE.md "never silence errors").
   - At `:96-100`, render the four lines from `recommendationContextLines(contextData)`.
   - Nothing else in the function changes. The pinned model, the validator order and the localisation pinned by `src/lib/recommendation-matches.test.ts:108-...` all stay as they are.
5. Keep `fetch-user-context`'s supabase-js 2.39.3 import (VTID-05008 F9). Run `node scripts/check-edge-data-client.mjs`; neither new helper creates a client.

## Tests

The convention: Deno functions with URL imports cannot be loaded by Vitest. They are pinned by source guards (`src/lib/edge-functions-caller-identity.s4.test.ts`, `src/lib/recommendation-matches.test.ts` "source contract"). Pure `_shared` helpers are imported directly (`src/lib/erase-user-data.test.ts`, `src/lib/recommendation-matches.test.ts`). The single Deno test file (`_shared/data-client.test.ts`, `UNIT-TESTS.yml:59`) is not extended, because that would need a `.github` edit.

1. **New `src/lib/read-json-body.test.ts`** (jsdom provides `Request`):
   - empty → `{kind:'empty'}`
   - whitespace only → `{kind:'empty'}`
   - `{"userId":"u1","forceRefresh":true}` → `{kind:'json'}` with the values
   - `not json`, `[1]`, `"x"`, `3`, `null` → `{kind:'invalid'}`
2. **`src/lib/recommendation-matches.test.ts`, new `recommendationContextLines` block:**
   - A full fixture shaped like the callee's response produces the expected four lines: interests joined, location, 3 diary entries truncated at 100 characters, and goals `'None'` for `[]`.
   - `null`, `{}`, `{context:{}}` and a non-object each produce all defaults.
   - Non-string interests are skipped.
   - More than 3 diary entries are capped at 3.
   - In the source contract block:
     - `generate-enhanced-recommendations` calls `recommendationContextLines(contextData)`.
     - It no longer contains `userContext.interests`, `userContext.profile` or `userContext.recentDiaryEntries`.
     - It destructures `error` from the `fetch-user-context` invoke.
3. **`src/lib/edge-functions-caller-identity.s4.test.ts`, `VTID-05049 fetch-user-context` block:**
   - The handler contains no `await req.json()`.
   - It imports `../_shared/read-json-body.ts`.
   - `readJsonBody(req)` comes before `isServiceRoleCaller(req)`.
   - The `'invalid'` path returns status 400.
   - The `'empty'` lenience is at the call site, with a comment.
   - The three existing VTID-05049 assertions stay unchanged.
4. **Local checks:**
   - `npx vitest run src/lib/read-json-body.test.ts src/lib/recommendation-matches.test.ts src/lib/edge-functions-caller-identity.s4.test.ts src/lib/vtna-token-name.test.ts` (the last one also reads `fetch-user-context`).
   - `node scripts/check-edge-data-client.mjs`
   - `npm run lint` must stay within `scripts/ci/pr-gate/baseline/eslint.json`, which lists 43 for `fetch-user-context`.
   - **Type-check baseline (F3):** `deno check` on both functions. The existing errors on `origin/main` for `fetch-user-context`, recorded in `docs/validation/VTID-05049/outputs/deno-check.txt`, are 5 diagnostics at 4 sites. All are in code this plan does not touch:
     - TS2353 `exchangeRates` not in the `economic` type (`fetch-user-context/index.ts:516`)
     - TS2353 `aiMemoryHighlights` not in the `memory` type (`:538`)
     - TS18046 `'error' is of type 'unknown'` (`:681`, the existing catch)
     - TS2339 `'catch' does not exist on type 'PromiseLike<void>'` (`:760`)
     - TS7006 implicit-any `err` (`:760`)
   - Acceptance: the same 5 diagnostics and no new one. They are anchored by message text, not line number, because the edit shifts lines by a few. The PR records the before and after output under `docs/validation/<VTID>/outputs/deno-check.txt`. For `generate-enhanced-recommendations`, the before and after outputs must be identical apart from removed errors.
5. **`docs/validation/<VTID>/staging-tests.json`:** edge functions have no staging twin. There is no staging Supabase, and staging frontends use the production project. Record a no-staging-target entry with that reason, pointing at the Vitest suites above. This follows the VTID-04860 precedent.

## Rollout

1. PR on vitana-v1, then merge. The push deploy is frozen by `cutover_gate` in `supabase-functions-deploy.yml`, so merging deploys nothing.
2. **No staging for edge functions.** STAGING-VERIFY cannot exercise them. Gate 2 is built from the CI evidence on the merge commit, the commit range, and the precondition below.
3. **Commit range for Gate 2.** List `git log <deployed head_sha>..<merge> -- <fn dir> supabase/functions/_shared` for each function. Take the `head_sha` from the workflow runs that produced v345 (2026-10-09 18:36 UTC) and v284 (2026-10-07 11:36 UTC). Expected besides this change:
   - **VTID-05023 `64f36ff5`**: both functions.
   - **VTID-05049 `6e7ada24`**: `fetch-user-context` only. Deploying this fix also puts VTID-05049's caller-auth change for this function live for the first time.
   The deploy ships a full snapshot of each function and `_shared`, so these commits cannot be excluded.
4. **Go/no-go precondition (F5).**
   - Facts: `_shared/data-client.ts` `resolveDataApiUrl` passes through to direct Supabase when `DATA_API_URL` is unset or blank. It throws `DataApiNotConfiguredError` when `CUTOVER_DONE=true` without `DATA_API_URL` (`data-client.ts:53-55`; tests `data-client.test.ts:115-129`).
   - Before dispatching, read the project's edge-function secret **names only** (Management API `GET /v1/projects/inmkhvwdcuyhnxkgfvsb/secrets`, through a read-only workflow step or MCP; values are never read or printed).
   - **GO** if `CUTOVER_DONE` is absent or not `'true'`.
   - **GO** if both `CUTOVER_DONE=true` and `DATA_API_URL` are present.
   - **NO-GO** in every other case.
   - **NO-GO** if the names cannot be read: hold the deploy, and the change stays merged but undeployed.
   - The result goes into the Gate 2 message.
5. **Deploy order** at Gate 2, on owner "yes" and GO:
   1. Dispatch `supabase-functions-deploy.yml` on `main` with `functions="fetch-user-context"`, then verify (step 6).
   2. Then dispatch with `functions="generate-enhanced-recommendations"`.
   The callee goes first, so the caller never maps a response from the old callee in a way that breaks. Even in the reverse order the mapping degrades to defaults, so the order is safe both ways.
6. **Read-only verification after each deploy:**
   - `list_edge_functions` shows a new version and `updated_at`, with `verify_jwt=true` unchanged (`config.toml:63-64`, `:75-76`).
   - `query_logs` (`function_edge_logs`, `function_logs`) shows no 5xx for either function on later organic calls, no `DataApiNotConfiguredError`, and no new `fetch-user-context failed` warning.
   - No production probe is made. With no organic traffic, record "no traffic yet" rather than generating any.
7. **Rollback:** re-dispatch the affected function from its previous deploy `head_sha`.

## Risks

- **Bundled commits that are not live yet.**
  - VTID-05049 changes who may pass a body `userId`. No in-repo or platform caller passes one, and no service-role caller was found.
  - VTID-05023 changes the PostgREST path. The precondition in Rollout 4 catches the throwing configuration, and VTID-05023 is already live in other functions (`request-account-deletion` was redeployed 2026-10-12 12:12 UTC).
  - Both are disclosed at Gate 2.
- **New 400 path.** Malformed JSON used to get a 500 and now gets a 400. No such caller exists.
- **Prompt content changes.** Real interests, location and diary snippets now reach the scoring model. That is the intent. The diary text is the member's own data, used for that same member, through the existing Bedrock bridge. Snippets are capped at 3 × 100 characters, which is unchanged from the caller's original intent.
- **Goals stay "None"**, because the callee returns `[]` (Problem 3). This is stated, not hidden.

## Out of scope

- **F4, deferred:** 44 other edge functions in `supabase/functions/` call a bare `await req.json()` (`git grep -l` on `origin/main`). Each 500s on an empty body in the same way. A follow-up VTID should adopt `_shared/read-json-body.ts` per function, starting with those that have bodyless callers. Tracked as a follow-up in the FU list.
- A real goals source for `health.goals`.
- The pre-existing `deno check` errors listed above.
- Replacing the legacy edge-function context path with the gateway.

## Owner decisions

1. At Gate 2, approve that the two deploys also ship the merged but not-yet-live VTID-05023 change (both functions) and VTID-05049 change (`fetch-user-context`). They cannot be excluded, and the deploys are conditional on the F5 secret-name precondition being GO.

<!-- plan:end -->

## Planner responses — round 1

- **F1 [minor] (the helper hides the empty-body lenience): ACCEPTED.** `readJsonBody` is now a strict parser that returns `json` / `empty` / `invalid` and never substitutes a default. The "empty = `{}`" lenience lives at the `fetch-user-context` call site, with a comment saying why (Fix 1–2). A test pins that the lenience is at the call site (Tests 3).
- **F2 [major] (the fix alone gives no user-visible improvement): ACCEPTED.**
  - The caller shape fix is folded in: `recommendationContextLines()` in `_shared/recommendation-matches.ts`, used at `generate-enhanced-recommendations/index.ts:96-100`, with the invoke error now logged.
  - A "User-visible result" section is at the top, and it notes honestly that goals stay "None".
  - Mapping tests were added (Tests 2).
  - The former owner decision (b) is dropped.
  - Scope grew to 7 files and 2 deploys. The class stays standard.
- **F3 [minor] (the deno-check baseline was not listed): ACCEPTED.** The 5 diagnostics at 4 sites are now listed inline with message and line, and are anchored by message text because line numbers shift. The acceptance rule is "same set, no new one", with the before and after outputs recorded (Tests 4).
- **F4 [minor] (44 other functions use bare `req.json()`): DEFERRED.** Recorded under Out of scope as a follow-up VTID that adopts the new helper. It is tracked in the FU follow-up list and not done here.
- **F5 [major] (the bundled VTID-05023 deploy needs a concrete go/no-go): ACCEPTED.**
  - There is now an explicit precondition (Rollout 4), based on the secret names only: GO if `CUTOVER_DONE` is not `'true'`, or if both `CUTOVER_DONE=true` and `DATA_API_URL` are set; NO-GO otherwise; NO-GO with merge-only if the names cannot be read.
  - It cites `data-client.ts:53-55` and `data-client.test.ts:115-129`.
  - The plan also states that the same `fetch-user-context` deploy is the first to put VTID-05049's change live, and the commit range covers both functions (Rollout 3).
- **F6 [minor] (test location): acknowledged.** The tests stay under `src/lib/`, following the existing `_shared`-import precedent.
- **Q3 (any caller in vitana-platform?):** No. `git -C /home/user/vitana-platform grep -n fetch-user-context origin/main` returns nothing: no reference in `services/`, `scripts/` or anywhere else. That matches VTID-05008 F5. The only caller anywhere is `generate-enhanced-recommendations/index.ts:39` in vitana-v1.

## Owner approval (Gate 1)
Approved by owner in Claude Code session https://claude.ai/code/session_01TMPMNGNEtPxKwmVqyfdx46 on 2026-10-12 ("Yes"), including the recommended option for every owner decision and the production steps named in the plan. Verdict: CONVERGED (2 rounds).

Final plan-body hash: `c64d7e0f61630b54cbbf7658f2ffea5f698efed0e19a534e87941b38a1a6a708`

## Approval

Owner approval (Gate 1): "Yes" — 2026-10-12, Claude Code session; plan hash c64d7e0f61630b54cbbf7658f2ffea5f698efed0e19a534e87941b38a1a6a708; sparring record 5d73d039-ac2f-4e98-b872-f71f118bcfa8.
