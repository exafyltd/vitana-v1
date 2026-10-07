# VTID-04961 — plan sparring record

- **Plan hash (sha256 of the text between the plan markers):** `329b5cd51d8171be56b15aba3d8dafa785e8e8a62b42c73e2b9e75605464ee4d`
- **Sparring session:** `plan_sparring_sessions.id = ccc62a78-c54c-4139-a892-9e828ad7e788`
- **Partner:** `plan-sparring-partner` agent (independent, read-only; saw only the plan file)
- **Verdict:** CONVERGED
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-07 — "Yes all four" (Gate 1, all four plans of the push-notification report). Binding exafy_admin click pending (`POST /api/v1/plans/spar/:id/approve`).

## Final plan

<!-- plan:begin -->
**Change class:** light
**Repo:** exafyltd/vitana-v1
**Scope:** `supabase/functions/send-appointment-reminder/index.ts` and its sibling `supabase/functions/send-appointment-email/index.ts` (identical broken embed at :175).

## Problem (verified read-only, 2026-10-05)
- `send-appointment-reminder` runs hourly and returns HTTP 500 every run (22/24h).
- Error: `PGRST200 Could not find a relationship between 'provider_appointments' and 'profiles'` — the select embeds `profiles!provider_appointments_user_id_fkey(...)` (index.ts:112, :119) but that FK points at `auth.users(id)`, not `profiles`, so PostgREST cannot resolve the embed.
- Impact today: none for members (4 rows in `provider_appointments`, 0 upcoming, last created 2025-10-09) — but every hour is a red 500 in the logs, and the feature is dead the moment anyone books.

## Change
1. Select `provider_appointments` rows without the embed (`select("*")`).
2. Fetch the recipient profiles in ONE batched query: `profiles.select("user_id, email, display_name, full_name").in("user_id", distinctUserIds)` (profiles has both `id` and `user_id`; use `user_id`, matching the FK target `auth.users.id`). Build a Map and attach to each appointment.
3. Same fix in `send-appointment-email`: single-row select without the embed, then `profiles.select(...).eq("user_id", appointment.user_id).maybeSingle()`; attach as `appointment.profiles` so the rest of the function is untouched.
4. Everything else unchanged (dedupe via `notification_logs`, settings gate, Resend send). The per-appointment dedupe/settings queries are pre-existing N+1 debt; at 4 total rows it is immaterial and out of scope.
5. Return 200 with `{sent:0,...}` when there are no appointments (already the behaviour once the query succeeds).

## Out of scope (noted, not fixed here)
- English-only email copy / `toLocaleDateString("en-US")` and the `appointments@resend.dev` sender are pre-existing i18n/deliverability debt; tracked as a follow-up note in the PR, not changed (no reminders are currently sent, so no regression).

## Verification
- `deno check` on both functions if Deno is available in the session; otherwise `npx eslint` on the two files (ESLint's `**/*.{ts,tsx}` glob covers `supabase/functions/**`). Existing `toLocaleDateString("en-US")` lines are not touched; if lint flags them as pre-existing, they get an `// i18n-allow-next-line: email template, English by design until i18n follow-up` comment rather than a behaviour change.
- No runtime test against production (absolute rule). After deploy (manual `supabase-functions-deploy.yml` dispatch — staging-first freeze means this is a live-project deploy and needs owner approval), read-only check: the function's next hourly run logs `Found 0 appointments` and returns 200 (read via Supabase logs only).

## Staging gate note
Edge functions deploy to the single live Supabase project; there is no staging twin, so the VTID-04610 staging run is structurally inapplicable. The owner's explicit approval of the manual `supabase-functions-deploy.yml` dispatch (functions=`send-appointment-reminder send-appointment-email`) substitutes for it, and the PR records this.

## Rollback
Redeploy the previous function version.
<!-- plan:end -->

## Sparring rounds (partner findings, condensed from the partner's own wording)

### Round 1 — NOT CONVERGED
Verified premises: embed at index.ts:112/:119 (TRUE); FK → auth.users(id) (TRUE, migration 20251009153331:4); profiles has id and user_id UNIQUE (TRUE); dedupe via notification_logs (TRUE).
- F1 [major] The sibling `send-appointment-email/index.ts:175` has the identical broken embed and is not in scope.
- F2 [major] Profiles are batched but the per-appointment notification_logs / notification_settings queries stay N+1; state it as known debt or batch them too.
- F3 [minor] `deno check` is not a CI step; state the concrete type-check command.
- F4 [minor] Staging Verification Gate (VTID-04610) not addressed for edge functions, which have no staging twin.
- F5 [minor] Confirm whether ESLint `i18n/no-raw-locale-call` covers `supabase/functions/**` (existing `toLocaleDateString("en-US")`).
- Q2: why 22/24? Q3: is profiles.user_id indexed?

### Round 2 — CONVERGED
F1 closed, F2 acknowledged (out-of-scope debt, 4 rows), F3/F4/F5 closed. ESLint glob `**/*.{ts,tsx}` confirmed to cover edge functions. No new blocker or major.

## Planner responses

## Planner responses — round 1
- F1 (sibling `send-appointment-email`) — ACCEPTED. Added to scope, same fix shape.
- F2 (N+1 in loop) — REJECTED for this plan: pre-existing, 4 rows total, 0 upcoming; batching changes dedupe semantics for no member benefit. Stated in plan as out-of-scope debt.
- F3 (type-check command) — ACCEPTED. Concrete commands stated.
- F4 (staging gate) — ACCEPTED. Staging gate note added.
- F5 (ESLint scope) — ACCEPTED. Confirmed `eslint.config.js` files glob `**/*.{ts,tsx}` covers edge functions; handling stated.
- Q2: 22 is the count of 500 responses in the queried 24h log window (hourly runs whose responses were retained); not a claim that 2 succeeded.
- Q3: `profiles.user_id` is UNIQUE → indexed.
