# VTID-05119 — acceptance (FU3: fetch-user-context empty body + caller context shape)

Plan: `plan-sparring.md` (hash c64d7e0f61630b54cbbf7658f2ffea5f698efed0e19a534e87941b38a1a6a708). Edge functions have
no staging project, so the evidence is Vitest (pure helpers imported directly + source guards; red on origin/main,
green here), `deno check` before/after, and the read-only post-deploy checks after the owner-approved dispatch.

AC-1 `_shared/read-json-body.ts` is a strict parser: an empty or whitespace-only body is `empty`, a JSON object is
`json` with its values, and malformed JSON or any non-object JSON (array, string, number, null) is `invalid`. It never
substitutes a default.
TEST: src/lib/read-json-body.test.ts › "VTID-05119 readJsonBody" (8 tests)

AC-2 `fetch-user-context` no longer calls a bare `await req.json()`. It parses with `readJsonBody(req)` before
`isServiceRoleCaller(req)`, answers an invalid body with 400 (CORS headers), and treats an empty body as "my own
context" at the call site, with a comment. A bodyless call with a member JWT therefore reaches `requireUser` instead of
answering 500.
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "VTID-05049 fetch-user-context" (3 new tests)

AC-3 VTID-05049 caller-auth semantics are unchanged: a body `userId` (now only when it is a string) counts only for a
service-role caller; everyone else gets their own context from the verified JWT; a different body id gets 403.
TEST: edge-functions-caller-identity.s4.test.ts › "VTID-05049 fetch-user-context" (2 existing tests, unchanged) and
"tree-wide" (2 tests, unchanged)

AC-4 `recommendationContextLines()` maps the callee's real `{ context, … }` shape: `community.userInterests` joined,
`health.goals` joined, `community.userLocation`, and the first 3 `health.recentDiaryEntries[].text` cut to 100
characters. Non-strings are skipped; a missing or garbled response yields "None" / "Not specified" as today.
TEST: src/lib/recommendation-matches.test.ts › "VTID-05119 recommendationContextLines" (9 tests)

AC-5 `generate-enhanced-recommendations` renders the prompt's USER CONTEXT through
`recommendationContextLines(contextData)`, no longer reads the non-existent `userContext.interests/profile/
recentDiaryEntries`, and logs a `fetch-user-context` invoke error with `console.warn` instead of swallowing it. The
pinned model, validator order and localisation are unchanged.
TEST: recommendation-matches.test.ts › "generate-enhanced-recommendations source contract" (2 new + 5 existing tests)

AC-6 No new type error, every function still builds its clients through createDataClient, every edge-function source
guard still passes, and no lint ratchet regresses.
TEST: outputs/deno-check.txt (same 5 fetch-user-context diagnostics and the same 1 pre-existing
generate-enhanced-recommendations diagnostic before and after; both new/changed helpers clean),
outputs/check-edge-data-client.txt, outputs/vitest-edge-source-guards.txt, outputs/eslint.txt

AC-7 The new guards are red on origin/main and green on this branch.
TEST: outputs/vitest-red-on-main.txt (14 failed), outputs/vitest-targeted.txt (66/66)
