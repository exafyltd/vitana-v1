# VTID-05049 — acceptance (Track S / S4, PR-C: S-H edge functions)

Plan: `plan-sparring.md` (hash 19347922045ecf05300f7742b67c2ec5510c396b3895a1887e0d9bb6d22f723e). Edge functions have
no staging project, so the evidence is the Vitest source guard (red on main, green here), `deno check`, and the
read-only post-deploy checks after the owner-approved manual dispatch.

AC-1 `_shared/caller-auth.ts` exists. `requireUser` verifies the bearer with `auth.getUser()` on the anon client and
returns 401 otherwise. `isServiceRoleCaller` accepts an exact (constant-time) match with `SUPABASE_SERVICE_ROLE_KEY`, or
a `service_role` claim verified by Supabase Auth (getClaims, then an admin-API read only a valid service-role key can
make). It uses supabase-js 2.57.2 and builds clients through `createDataClient`.
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "VTID-05049 _shared/caller-auth.ts" (5 tests)

AC-2 `linkedin-import` and `social-media-import` authenticate with `requireUser` before reading the body, write only
the verified user's profile, and answer 403 when a body `userId` names someone else. `linkedin-import` is flagged for
removal (no app caller).
TEST: edge-functions-caller-identity.s4.test.ts › "profile imports write only the caller's own profile"

AC-3 `fetch-user-context` honours a body `userId` only for a service-role caller; everyone else gets their own context
from the verified JWT, and a mismatching body id gets 403.
TEST: edge-functions-caller-identity.s4.test.ts › "VTID-05049 fetch-user-context"

AC-4 `queue-campaign-recipients` is service-role only (401 otherwise, no exafy_admin path), reloads the campaign (404
if missing, 409 unless scheduled/active), takes the message from the campaign row, and scopes recipient queries to the
campaign owner (contacts, segments, events) and the owner's primary tenant (profiles).
TEST: edge-functions-caller-identity.s4.test.ts › "queue-campaign-recipients is service-role only" (5 tests)

AC-5 `send-welcome-discount` returns 401 unless `isServiceRoleCaller`, builds the email from the
`user_discount_codes` row named by `discount_code_id` (body user/code/percent/expiry ignored), and HTML-escapes every
interpolated value.
TEST: edge-functions-caller-identity.s4.test.ts › "send-welcome-discount is service-role only" (3 tests)

AC-6 Tree-wide: no edge function that uses the service role reads a user id from the body without `getUser`,
`getClaims` or `_shared/caller-auth`.
TEST: edge-functions-caller-identity.s4.test.ts › "tree-wide" (2 tests)

AC-7 The guard is red on origin/main and green on this branch; every existing edge-function source guard still passes
and every function still builds its clients through createDataClient.
TEST: outputs/vitest-s4-guard-red-on-main.txt, outputs/vitest-s4-guard.txt, outputs/vitest-edge-source-guards.txt,
outputs/check-edge-data-client.txt

AC-8 The changed functions type-check under Deno with no new errors (the remaining errors in linkedin-import and
fetch-user-context are identical on origin/main, in untouched code).
TEST: outputs/deno-check.txt

AC-9 `supabase/config.toml` `verify_jwt` is unchanged, and nothing is deployed by this PR.
TEST: `git diff origin/main -- supabase/config.toml` is empty (commands.log)
