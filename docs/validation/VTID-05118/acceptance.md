# VTID-05118 — Welcome-discount emails: edge function accepts the trigger secret (vitana-v1 part)

Plan: `plan-sparring.md` (hash b9dd9fff6c2c54947f6bd53fa205b52ebf7c5d23b4d84d28c59930da7c58653a, converged in 2 rounds,
owner "Yes" 2026-10-12). Two repos: this PR is the edge-function side; the exafyltd/vitana-platform PR (same VTID)
redefines `public.notify_welcome_discount()` to send vault `email_trigger_secret` as `X-Trigger-Secret`. **This
function is deployed first** (manual dispatch of `supabase-functions-deploy.yml`), then the platform migration is
applied. Edge functions have no staging project, so the evidence is Vitest (red without the source change, green here).

AC-1 New import-free `supabase/functions/_shared/trigger-secret.ts` exports `timingSafeEqual` (moved from
`caller-auth.ts`) and `isTriggerSecretCaller(req, getEnv?)`: true only when `x-trigger-secret` equals (constant-time) the
`EMAIL_TRIGGER_SECRET` edge secret; an unset or blank secret, a missing header, a wrong value and a bearer token all
give false. `Deno` is reached only through `globalThis` at call time.
TEST: src/lib/trigger-secret.test.ts (7 tests)
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "VTID-05118 _shared/trigger-secret.ts"

AC-2 `_shared/caller-auth.ts` imports `timingSafeEqual` from `./trigger-secret.ts` (one implementation) and re-exports
`isTriggerSecretCaller`; `isServiceRoleCaller` is unchanged.
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "caller-auth.ts imports timingSafeEqual from it and re-exports isTriggerSecretCaller", "VTID-05049 _shared/caller-auth.ts"

AC-3 `send-welcome-discount` answers 401 unless `isTriggerSecretCaller(req) || await isServiceRoleCaller(req)`, in one
guard before `req.json()`. It still reads only `discount_code_id` from the body, builds the email from the
`user_discount_codes` row and HTML-escapes every value. Deliberate contract change from VTID-05049 "service-role only".
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "send-welcome-discount accepts only a service-role or trigger-secret caller"

AC-4 The CORS allow-headers string stays exactly `"authorization, x-client-info, apikey, content-type"` (pg_net calls
server to server; no browser sends the trigger secret).
TEST: src/lib/edge-functions-caller-identity.s4.test.ts › "keeps the CORS allow-headers string"
