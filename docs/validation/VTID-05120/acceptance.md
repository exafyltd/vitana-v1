# VTID-05120 — acceptance (FU4: campaign audiences + process-campaign-queue guard)

Plan: `plan-sparring.md` (hash 63340e7c560d875fb69133798ebb9000a08d6c9e5ec4e072b15406eed819989d). Edge functions have
no staging project (one shared Supabase), so the evidence is the Vitest suite (behaviour over an in-memory fake
PostgREST client, plus source guards), `deno check`, and the read-only post-deploy checks after the owner-approved
manual dispatch. Sending stays closed: `CAMPAIGN_QUEUE_ENABLED` is unset, so `queue-campaign-recipients` is a dry run.

AC-1 Event attendees are read from `global_event_participants` with `status = 'attending'` (never `response`), with no
`profiles` embed, and only for events the campaign owner created.
TEST: src/lib/campaign-audience.test.ts › "eventAttendees reads global_event_participants.status=attending, never response",
"an event the owner does not own contributes nothing"

AC-2 "Your Followers" is a new branch: `user_follows.follower_id` where `following_id = owner`. "Event attendees" no
longer adds the organizer's followers, and `social_connections` is never read.
TEST: src/lib/campaign-audience.test.ts › "yourFollowers reads user_follows.following_id = owner",
"eventAttendees alone does not add the organizer's followers"

AC-3 Member contact details come from one `profiles` lookup (`user_id, display_name, full_name, email, phone`, never
`contact_*`), filtered by `tenant_id` as a real row filter, chunked to 500 ids.
TEST: src/lib/campaign-audience.test.ts › "looks profiles up by email/phone with a real tenant_id row filter", "chunks the profile lookup"

AC-4 Accounts in `service_bot_accounts` or `notification_test_actors` are excluded from attendees, followers and
segments, before the profile lookup (CLAUDE.md rules 43-45). The allowlist read fails closed.
TEST: src/lib/campaign-audience.test.ts › "excludes service_bot_accounts and notification_test_actors …",
"never queries a profile id that is on an allowlist", "a query error on service_bot_accounts …"

AC-5 Every audience query error throws `CampaignAudienceError(step)`; `queue-campaign-recipients` answers 500 with the
step and writes nothing. An owner-tenant lookup error throws; a member audience with no tenant answers 409
`campaign_owner_has_no_tenant`; the final status update throws on error.
TEST: src/lib/campaign-audience.test.ts › "a query error on %s throws CampaignAudienceError naming the step" (8 cases),
"a member audience without a tenant throws (fail closed)"; src/lib/campaign-queue.vtid-05120.test.ts › "fails loudly: …"

AC-6 Vitana contacts keep their own `contacts.contact_*` mapping scoped by `contacts.user_id = owner`, and make no
`profiles` or allowlist query. CSV and manual entries are unchanged.
TEST: src/lib/campaign-audience.test.ts › "vitanaContacts uses contacts.contact_* …", "csv and manual entries pass through unchanged …"

AC-7 The audience comes from the campaign row (`distribution_config.audience_data`); the request's `audienceData` is a
logged legacy fallback only. `trigger-scheduled-campaigns` passes `audience_data ?? audienceData` and no longer
invents `{ vitanaContacts: true }`.
TEST: src/lib/campaign-queue.vtid-05120.test.ts › "reads the audience from distribution_config.audience_data …",
"trigger-scheduled-campaigns passes the stored audience key"

AC-8 Send path closed by default: unless `CAMPAIGN_QUEUE_ENABLED === 'true'`, the function returns
`200 { dry_run: true, counts }` and inserts/updates nothing. When enabled, every row is built first and
`campaign_recipients` is inserted in one batch that throws on error (no per-row `continue`).
TEST: src/lib/campaign-queue.vtid-05120.test.ts › "checks CAMPAIGN_QUEUE_ENABLED before any insert or campaign update",
"builds every row first and inserts campaign_recipients once, throwing on error"

AC-9 `process-campaign-queue` (verify_jwt=false) checks `isServiceRoleCaller` as the first statement of its handler
and answers anyone else with `unauthorizedResponse` (401).
TEST: src/lib/campaign-queue.vtid-05120.test.ts › "VTID-05120 process-campaign-queue is service-role only" (2 tests)

AC-10 Every column the resolver selects or filters on exists in `src/integrations/supabase/types.ts` (the two
allowlist tables, absent from the generated types, are pinned to `user_id`); a rename fails CI.
TEST: src/lib/campaign-queue.vtid-05120.test.ts › "schema guard: the resolver reads only real columns" (10 tests)

AC-11 VTID-05049's guards still hold (service-role check first, message from the row, owner/tenant scoping), rewritten
for the move into `_shared/campaign-audience.ts`; every edge-function source guard and the data-client check pass.
TEST: outputs/vitest-vtid-05120.txt (66/66), outputs/vitest-edge-source-guards.txt (17 files, 176 tests),
outputs/check-edge-data-client.txt, outputs/deno-check.txt, outputs/vitest-vtid-05120-red-on-main.txt (red on main)
