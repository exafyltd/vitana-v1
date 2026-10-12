# VTID-05120 — plan sparring record (FU4: campaign audiences + process-campaign-queue guard)

Copy of the final sparred plan (plan body, the round-1 planner responses to every partner finding, verdict). The partner's verbatim findings are kept in sparring record `79a01f09-bd9d-4c09-975f-34a9c3c002d7`; finding ids F1-F7 and Q1-Q2 below refer to them.

- Verdict: CONVERGED (2 rounds)
- Final plan hash: 63340e7c560d875fb69133798ebb9000a08d6c9e5ec4e072b15406eed819989d

---

# FU4: queue-campaign-recipients resolves audiences against columns that don't exist, then hides the errors

change class: standard (an edge function that queues outbound email, SMS or WhatsApp to real members; no schema change)
scope: vitana-v1 `supabase/functions/queue-campaign-recipients/index.ts`, `supabase/functions/process-campaign-queue/index.ts` (caller guard only), new `supabase/functions/_shared/campaign-audience.ts`, `supabase/functions/trigger-scheduled-campaigns/index.ts` (one line: the audience key), new `src/lib/campaign-audience.test.ts`, `docs/validation/<VTID>/{plan-sparring.md,staging-tests.json}`

<!-- plan:begin -->

## Problem (evidence, re-checked 2026-10-12 on origin/main and in live information_schema on project inmkhvwdcuyhnxkgfvsb)

Code is `vitana-v1` `supabase/functions/queue-campaign-recipients/index.ts` on origin/main. Last touched by 6e7ada243 (VTID-05049) and 64f36ff5f (VTID-05023).

1. **Event attendees** (L96-101): `global_event_participants.select('user_id, profiles:user_id(display_name, contact_email, contact_phone, tenant_id)').eq('response','attending')`.
   - Live columns are `id, event_id, user_id, status, registered_at`. There is no `response`. The live status values are only `attending` (18 rows).
   - There is no FK from `global_event_participants.user_id` to `profiles`, so the `profiles:user_id` embed cannot resolve either (the only FK is `event_id -> global_community_events`).
   - The error is dropped by `if (!attendeesError && attendees)` (L103). The result is always zero attendees.
2. **Organizer followers** (L127-132): `social_connections.select('follower_id, profiles:follower_id(...)').eq('following_id',…).eq('status','active')`.
   - `social_connections` is the OAuth social-provider table (`provider, access_token, …`). It has no `follower_id`, `following_id` or `status` columns.
   - The real follow graph is `user_follows(follower_id, following_id)`, with 160 rows. Its FKs point to `auth.users`, not `profiles`, so the embed would fail there too.
   - `error` is not even destructured. The result is always zero followers.
3. **Profile contact columns:** `profiles.contact_email` and `profiles.contact_phone` do not exist. The live columns are `email`, `phone` and `phone_e164`.
4. **Tenant filter is not a filter** (L101, L132): `.eq('profiles.tenant_id', tenantId)` on an embedded resource with no `!inner` only nulls the embed. It does not drop rows. It only "worked" because the profile was then skipped when null.
5. **Audience never reaches the function:**
   - `trigger-scheduled-campaigns/index.ts:64` passes `distributionConfig.audienceData || { vitanaContacts: true }`.
   - The app stores `distribution_config.audience_data` (snake case, `src/components/sharing/CampaignDialog.tsx:239`). All 36 live rows with an audience use `audience_data`, and none use `audienceData`.
   - The fallback `{vitanaContacts: true}` has no `.enabled`, so every audience branch is skipped. The function always answers "No recipients found".
6. **`yourFollowers` is never handled:**
   - The type is `src/types/audience.ts:22-25`. Live usage of `audience_data` with `enabled=true` is `yourFollowers` 23, `eventAttendees` 11, `vitanaContacts` 6.
   - The most-used audience type is ignored. Today "event attendees" also adds the organizer's followers (L119-149), which mixes two audiences the UI keeps separate.
7. **Swallowed errors elsewhere:**
   - the owner-tenant lookup (L67-74, error ignored, so `tenantId=null` silently skips audiences)
   - `ownedEvent` (L87-93)
   - contacts (L155-159)
   - segments (L197-211)
   - per-recipient insert (L278-281, `continue`)
   - the final campaign status update (L319-329, result ignored)
8. **Downstream contract is also broken (wider than the reported issue):**
   - Live `message_queue` has `channel_type, payload, attempts, max_attempts, …` and CHECKs status ∈ {pending, processing, completed, failed, cancelled}.
   - The function inserts `channel, recipient_email, recipient_phone, recipient_name, message_content, retry_count` (L286-299). None of those columns exist.
   - `process-campaign-queue` reads `.eq('channel',…)` and writes `status:'sending'/'sent'`, `sent_at` and `retry_count`, which are also invalid.
   - So today the moment any audience resolves, the function inserts `campaign_recipients` rows one by one and then throws on the `message_queue` insert. That leaves orphan `campaign_recipients` rows and returns a 500.
9. **No exclusion of non-real accounts (platform CLAUDE.md rules 43-45):**
   - None of the member-sourced audiences (attendees, followers, segments) exclude `service_bot_accounts` (4 rows) or `notification_test_actors` (3 rows). 5 profiles match those lists.
   - This is moot today only because the queries return nothing.
10. **Live exposure today: zero.**
    - `campaigns`: 40 rows, all `status='draft'`. Zero `scheduled`, `active` or `distributing`.
    - `campaign_recipients`: 0 rows. `message_queue`: 0 rows.
    - No `cron.job` mentions campaigns. Nothing in `src/` or vitana-platform invokes `trigger-scheduled-campaigns` or `queue-campaign-recipients`, so the only caller is `trigger-scheduled-campaigns` (VTID-05044 sparring, H3).
    - However, `useCampaigns.ts:203` lets any campaign owner set `status='scheduled'`, and `trigger-scheduled-campaigns` is `verify_jwt=false` with no caller check (`config.toml:126-127`). Anyone can poke it.
11. **Caveat:** since VTID-05023, edge-function PostgREST traffic may go to Aurora (`_shared/data-client.ts`, `DATA_API_URL`). I verified the schema on Supabase only. The implementer must confirm the same columns and FKs on the Aurora side, read-only, before merge.

## Fix (smallest safe)

The fix has two parts:
- **A. Correct the audience resolution and fail loudly.** This is the reported issue.
- **B. Keep the send path closed** until the owner decides to turn campaigns on. Fixing A alone makes audiences non-empty, and with the broken `message_queue` contract (item 8) that would produce orphan `campaign_recipients` and 500s, or, if someone later "fixes" the queue, real sends.

A1. New `supabase/functions/_shared/campaign-audience.ts`. It takes an injected client and has no URL (`https://esm.sh`/`deno.land`) imports, so Vitest imports it directly. It exports `resolveCampaignAudience(client, { ownerId, tenantId, audience })`, which returns `{ recipients, counts }` or throws. Every query checks `error` and throws `CampaignAudienceError(step, error)`. It works in two steps and uses no embeds:
- **eventAttendees:**
  - Keep the existing owner check on `global_community_events` (`created_by = ownerId`), and throw on its error.
  - Read `global_event_participants.select('user_id').eq('event_id', id).eq('status','attending')`.
- **yourFollowers (new branch):** `user_follows.select('follower_id').eq('following_id', ownerId)`. These are the campaign owner's followers, which is what the UI label "Your Followers" means.
- **Organizer followers:** removed from the `eventAttendees` branch. The organizer is the owner (enforced by the owner check), so this audience is now exactly `yourFollowers`. It is sent only when the user ticked that box. This makes the "event attendees" audience smaller, never larger.
- **Profile lookup for the collected user ids:**
  - `profiles.select('user_id, display_name, full_name, email, phone')`. `phone_e164` exists live but is missing from the generated `types.ts`, so it is left outwith `.in('user_id', ids).eq('tenant_id', tenantId)`, chunked to 500 ids per call.
  - This is a real row filter on tenant.
- **Exclusion (rules 43-45):**
  - Load `service_bot_accounts.user_id` and `notification_test_actors.user_id` once per call, and throw on error.
  - These tables are readable by the service-role edge client. Precedent: `supabase/functions/generate-daily-matches/index.ts:120-134` reads both tables the same way.
  - That precedent fails open (it only warns) because it is a read surface. This function is a send path, so it fails closed.
  - Drop those ids before the profile lookup.
  - Apply the same exclusion to the segments branch.
- **vitanaContacts, csvUpload, manualContacts:** logic unchanged. They throw on error now.
  - Contacts keep their own mapping from the `contacts` table: `contact_name`, `contact_email` and `contact_phone`, which are the real `contacts` columns.
  - Contacts do **not** go through the shared profile lookup, the tenant filter or the exclusion step. They are the owner's own address book rows, scoped by `contacts.user_id = ownerId`.
- **segments:** unchanged behaviour (it yields no email or phone, so nothing gets queued). It now throws on error and excludes the two allowlists.

A2. `queue-campaign-recipients/index.ts`:
- Read the audience from the campaign row: `campaign.distribution_config.audience_data`. Use the request's `audienceData` only as a legacy fallback, and log when it is used.
  - Reason: the message already comes from the row (VTID-05049 defence in depth). The audience should too, so a caller cannot widen it.
- Throw on an owner-tenant lookup error.
- Return 409 `campaign_owner_has_no_tenant` when `tenantId` is null and a member-sourced audience is enabled, instead of silently skipping it.
- Call `resolveCampaignAudience`. On `CampaignAudienceError`, return a 500 that names the step, and write nothing.
- Return `counts` per source in the response and the log.

A3. `trigger-scheduled-campaigns/index.ts:64`: pass `distributionConfig.audience_data ?? distributionConfig.audienceData`, and drop the `{ vitanaContacts: true }` fallback. This is now harmless, since A2 reads the row, but it keeps the two in step.

B1. **Send-path guard (owner decision D1, default = closed):**
- Before any insert, `queue-campaign-recipients` checks the edge secret `CAMPAIGN_QUEUE_ENABLED === 'true'`.
- When unset, it runs the full resolution and returns `200 { dry_run: true, counts }`.
  - It inserts nothing into `campaign_recipients` or `message_queue`, and it does not change the campaign status.
  - This replaces today's de-facto "always empty" with an explicit, logged "not enabled".
- Also move the `campaign_recipients` inserts after a successful build of the queue items. Insert them in one batch and throw on error (no `continue`), so a failure never leaves orphans.
- **The dry-run guard is what prevents orphan `campaign_recipients` rows.** Batching only narrows the window: the `campaign_recipients` insert and the `message_queue` insert stay two separate calls, so they are not atomic.
- The `message_queue` column mapping (item 8) is **not** fixed here.
  - Turning `CAMPAIGN_QUEUE_ENABLED` on is a future VTID (follow-up FU4-b, see Out of scope).
  - That VTID must first fix the `message_queue` contract and make both inserts atomic, for example in one DB function.

B2. **`process-campaign-queue` caller guard (sparring F2):**
- Add `if (!(await isServiceRoleCaller(req))) return unauthorizedResponse(corsHeaders);` at the top, using the existing `_shared/caller-auth.ts:61`. This is the same pattern as `queue-campaign-recipients:21-23`.
- The function is `verify_jwt=false` (`config.toml:120-121`). Leave that unchanged: the guard does the check.
- **Callers today:** the only caller is `trigger-scheduled-campaigns/index.ts:95`, which uses `functions.invoke` with a service-role client (L16-19), so it passes the guard.
  - No `cron.job` and no `pg_proc` body references `campaign-queue`, `scheduled-campaigns` or `campaign-recipients`. I checked with a read-only SQL query.
  - Nothing in `src/` or vitana-platform calls it.
  - No legitimate non-service-role caller is cut off.

## Tests

- New `src/lib/campaign-audience.test.ts` (Vitest). It imports `_shared/campaign-audience.ts`, the same pattern as `src/lib/erase-user-data.test.ts`, and uses an in-memory fake PostgREST client that records table, columns and filters. Cases:
  1. eventAttendees uses `global_event_participants.status='attending'` and never `response`.
  2. yourFollowers reads `user_follows.following_id = ownerId`.
  3. The profile lookup selects `email, phone` and never `contact_email`, and filters `tenant_id` as a row filter.
  4. Ids in `service_bot_accounts` or `notification_test_actors` are excluded from attendees, followers and segments.
  5. Any query error throws `CampaignAudienceError` with the step name. A parameterised case covers each branch.
  6. An event not owned by the owner contributes nothing.
  7. eventAttendees alone does not add followers.
- Contacts case: a vitanaContacts-only audience produces recipients from `contacts.contact_*`, makes no `profiles`, `service_bot_accounts` or `notification_test_actors` query, and stays scoped by `user_id = ownerId`.
- Caller-identity guard for `process-campaign-queue`, added to the `src/lib/edge-functions-caller-identity.s4.test.ts` pattern:
  - the `isServiceRoleCaller` check is the first statement in the handler;
  - an unauthorised caller gets `unauthorizedResponse`.
- Source guards are added to the existing `src/lib/edge-functions-caller-identity.s4.test.ts` block for VTID-05049, or a sibling file:
  - The function reads `distribution_config.audience_data`.
  - It contains no `contact_email`, `social_connections` or `.eq('response'`.
  - It checks `CAMPAIGN_QUEUE_ENABLED` before any `.insert(`.
  - The service-role check from VTID-05049 is still first.
- Schema guard: assert the columns used (by a regex over the file) are in a pinned list taken from `src/integrations/supabase/types.ts` for those tables, so a future rename fails CI.
- `docs/validation/<VTID>/staging-tests.json`: read-only.
  - An unauthenticated POST to `queue-campaign-recipients` returns 401.
  - **Never** invoke it with service role against a real campaign. Staging writes to production Supabase (rule 48), and there are no test campaigns.
  - Behaviour is proven by the Vitest suite.

## Rollout

- Normal PR flow. On merge the push deploy is frozen at the cutover gate.
- At Gate 2, dispatch `supabase-functions-deploy.yml` with `functions="queue-campaign-recipients trigger-scheduled-campaigns process-campaign-queue"`, pinned to the merge commit.
- Before that, diff `git log <last deploy>..<commit> -- supabase/functions/{queue-campaign-recipients,trigger-scheduled-campaigns,_shared}` and confirm only this PR is in range.
- Leave `CAMPAIGN_QUEUE_ENABLED` unset, so the deploy changes no send behaviour (dry-run counts only).
- Post-deploy: run the read-only SQL `SELECT status, count(*) FROM campaigns GROUP BY 1` plus counts on `campaign_recipients` and `message_queue`. Expect no change from the baseline: 40 draft, 0 and 0.

## Risks

- **R1, larger real audiences:** this is the core risk. Today every campaign resolves to zero recipients. After A1, a scheduled campaign would resolve to real members: followers (up to 160 follow edges in total), event attendees (18), and contacts.
  - Mitigated by B1, which defaults to a dry run and needs an explicit owner flip.
  - Also: zero campaigns are scheduled or active today, so nothing is "re-processed" on deploy.
  - Also: removing the organizer-follower add-on from eventAttendees shrinks that audience.
- **R2, member email and phone used for marketing:** sending to `profiles.email`/`phone` is outreach to members who did not explicitly opt in to campaign messages from another member. There is no consent or unsubscribe check in this path. Owner decision D2 is required before `CAMPAIGN_QUEUE_ENABLED` is ever set.
- **R3, trigger exposure:** `trigger-scheduled-campaigns` has no caller check and `verify_jwt=false`, and owners can set `scheduled` from the app. With B1 closed this can only produce dry runs.
- **R4, Aurora drift:** see item 11. Verify the columns and FKs on Aurora read-only before merge.
- **R5, now-loud failures:** campaigns that used to "succeed with 0" will now return explicit 409 or 500. `trigger-scheduled-campaigns` records them as `success:false`. No user-facing surface shows this today.

## Out of scope

- **Follow-up FU4-b (deferred, its own VTID; required before `CAMPAIGN_QUEUE_ENABLED` may ever be set):** fix the `message_queue` contract in both `queue-campaign-recipients` (L286-299) and `process-campaign-queue`.
  - Columns: `channel` → `channel_type`; `retry_count` → `attempts`, with `max_attempts` replacing `MAX_RETRIES`.
  - Payload: pack `recipient_email`, `recipient_phone`, `recipient_name` and `message_content` into `payload` jsonb.
  - Status values: `sending` → `processing`, `sent` → `completed`, to satisfy the `message_queue_status_check` constraint.
  - `sent_at` → `processed_at`.
  - Make the `campaign_recipients` and `message_queue` writes atomic, for example in one DB function.
  - It only makes sense after D1 and D2.
- Adding auth to `trigger-scheduled-campaigns` (`process-campaign-queue` is now in scope, B2), and scheduling it with cron. Recommend a separate security VTID under the VTID-05049 track.
- The "instant" activation path (`useCampaigns.ts:203` sets `active`, which no backend processes).
- Real segment criteria evaluation.
- Adding FKs from `global_event_participants`/`user_follows` to `profiles`.

## Owner decisions

- **D1:** keep the campaign send path closed (`CAMPAIGN_QUEUE_ENABLED` unset, dry-run counts only) after this fix. **Recommended: yes**, until the out-of-scope `message_queue` contract fix and D2 are done.
- **D2:** may member-to-member campaigns email or SMS other members (followers or event attendees) at all, and under which consent and unsubscribe rule? **Recommended:** no sends to member-sourced audiences until an opt-in or unsubscribe check exists. Contacts, CSV and manual entries are the owner's own lists.
- **D3:** confirm "Your Followers" means the campaign owner's followers (`user_follows.following_id = owner`), and that "Event attendees" means only `global_event_participants.status='attending'` for the owner's own events, with no organizer followers added. **Recommended: yes**, because it matches the UI types and only narrows.

<!-- plan:end -->

---

## Planner responses — round 1

- **F1 [minor] `phone_e164` is not in the generated types: ACCEPTED.**
  - Checked read-only in `information_schema`: `profiles.phone_e164` exists live, but it is missing from `src/integrations/supabase/types.ts`.
  - It is dropped from the select. `phone` is enough, and the schema guard pins against the generated types.
- **F2 [major] `process-campaign-queue` has `verify_jwt=false` and no caller auth: ACCEPTED, option (b).** New step B2 adds the `isServiceRoleCaller` guard (`_shared/caller-auth.ts:61`) plus a caller-identity test.
  - The only caller is `trigger-scheduled-campaigns:95`, which invokes with a service-role client (L16-19).
  - There is no cron job and no DB function caller (read-only check of `cron.job` and `pg_proc`), and no caller in `src/` or vitana-platform.
  - No non-service-role caller exists. Scope and the deploy list are updated.
- **F3 [major] contacts path: ACCEPTED.** Contacts keep their own `contact_*` mapping from `contacts` (`user_id = ownerId`) and skip the profile lookup and the exclusion step. A test asserts this.
- **F4: acknowledged.**
- **F5 [major] orphan protection: ACCEPTED, part DEFERRED.**
  - The plan now says plainly that the dry-run guard is what prevents orphans. The two inserts are not atomic in this PR.
  - Turning `CAMPAIGN_QUEUE_ENABLED` on is deferred to follow-up FU4-b (named in Out of scope). FU4-b must first fix the `message_queue` contract and make both inserts atomic in one DB function. This also answers Q2.
- **F6 [minor] Vitest vs Deno imports: ACCEPTED.** `campaign-audience.ts` takes an injected client and has no URL imports, so Vitest imports it directly. Precedent: `src/lib/erase-user-data.test.ts` imports `_shared` modules.
- **F7 [minor]: ACCEPTED.** Out of scope now names the `process-campaign-queue` / `message_queue` column mapping.
- **Q1: confirmed.** `supabase/functions/generate-daily-matches/index.ts:120-134` reads `service_bot_accounts` and `notification_test_actors` (`select('user_id')`) with the service-role edge client.
  - That precedent fails open with a warning, because it is a read surface.
  - This plan fails closed, because it is a send path.

## Owner approval (Gate 1)
Approved by owner in Claude Code session https://claude.ai/code/session_01TMPMNGNEtPxKwmVqyfdx46 on 2026-10-12 ("Yes"), including the recommended option for every owner decision and the production steps named in the plan. Verdict: CONVERGED (2 rounds).

Owner approval (Gate 1): "Yes" — 2026-10-12, Claude Code session; plan hash 63340e7c560d875fb69133798ebb9000a08d6c9e5ec4e072b15406eed819989d; sparring record 79a01f09-bd9d-4c09-975f-34a9c3c002d7.
