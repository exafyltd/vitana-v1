# VTID-04889 — Plan Sparring record

- Change class: standard. Tier: session (plan-sparring skill, partner agent `plan-sparring-partner`, read-only).
- Rounds: 2. Verdict: **CONVERGED** (round 1: 6 findings + 3 questions — F4 major, F1–F3, F5, F6 minor; round 2: all
  closed, no new findings).
- Final plan hash (canonical): `dee0fbeeffac31e637d6dbe0fc6e13aaf373bf12908ec62820bf9ffb90005c20`
- Owner decision 2026-10-05 ("move to bedrock") on the VTID-04883 sparring finding; owner approval of this plan
  2026-10-05 (chat, "yes").
- VTID allocated after approval with `p_plan_hash`; the gate was in `log` mode.

## Round 1 findings (partner, summarised verbatim)
- F1 [minor] Say exactly how the text fallback is parsed and that the same validation applies to both paths.
  → ACCEPTED: one pure helper for both; `JSON.parse` of the outermost `[`…`]` span.
- F2 [minor] `generateContent`'s first positional argument stays (ignored by the bridge). → ACCEPTED: pass `''`.
- F3 [minor] `extractTextFromResponse` reads `parts[0]` only. → no change: the tool call takes priority; text-only
  replies put the text in `parts[0]` (gateway ai-bridge.ts:132-139).
- F4 [major] Is the id-in-candidate-set check enough for data safety? → ANSWERED: candidates are read from
  `global_community_events` / `global_community_groups` in the same request through the member's RLS
  (index.ts:37-53), so a kept id exists and is visible to that member.
- F5, F6 [minor] Staging verification approach and DATABASE_SCHEMA.md: no action (no staging Supabase; no schema
  change).
- Q1 pinned model deliberate (design item 3); Q2 helper under `_shared/`, imported by Vitest like
  bedrock-bridge-client.test.ts; Q3 no `cron.job` or repo reference invokes `generate-recommendations`.
- Added by the planner: events/groups created by test/service accounts are not filtered (deferred to a rule-45
  follow-up; VTID-04888 covers member profiles and Find-a-Match).

## Round 2
"All round-1 findings are closed … No new blocker or major findings … CONVERGED."

---

# Plan — D4: move the event/group recommendation edge function off Gemini onto Bedrock

Owner decision 2026-10-05 ("1. move to bedrock") on the VTID-04883 sparring finding: vitana-v1's recommendation edge
functions call the Gemini Developer API — forbidden Google (platform CLAUDE.md ALWAYS 10a–10c, IF-THEN 26/27).

<!-- plan:begin -->
## Change class
standard (vitana-v1 edge functions only; no migration, no route, no frontend change; edge deploy is a manual,
owner-approved dispatch to the single Supabase project).

## Evidence (file:line)
- `supabase/functions/generate-enhanced-recommendations/index.ts:71-79` chooses the client with
  `AI_BRIDGE_PROVIDER || 'gemini'` and dynamic-imports `_shared/gemini-client.ts` unless that secret is `bedrock`.
  The secret was never flipped (platform `docs/AURORA-B7-EDGE-FUNCTIONS-INVENTORY.md` 2026-08-29 addendum: "flipping …
  is a separate, later decision, not done"). It is shared by 4 other functions (generate-proactive-greeting,
  social-media-import, transcribe-audio, generate-event-image), so flipping it is not a D4-only change.
- Caller: `src/hooks/useEventRecommendations.ts:67` (`generateRecommendations`, a manual button, used by
  `src/pages/Community.tsx`). `event_recommendations` / `group_recommendations` have 0 rows ever: GCP is off, so the
  Gemini path cannot have worked since 2026-08-16 (and before the earlier `supabase` ReferenceError fix it threw before
  reaching any provider).
- `supabase/functions/generate-recommendations/index.ts:126-194` calls Gemini unconditionally; no caller in `src/`,
  `supabase/` or workflows (grep); still deployed (v339) and listed in `supabase/config.toml:66`.
- Bedrock path: `_shared/bedrock-bridge-client.ts` `generateContent()` (same signature) → gateway
  `POST /api/v1/ai-bridge/generate` (`services/gateway/src/routes/ai-bridge.ts:142`, `requireServiceOrAdmin`,
  `invokeBedrock`). Model = `options.model || BEDROCK_MODEL_ID || eu.anthropic.claude-sonnet-4-6` (:52, :165). The live
  task-def `BEDROCK_MODEL_ID` is not readable from here (prod workflow "EMPTY = preserve"), and backend.md §2b records
  it once held an unsubscribed id. The route passes `tools` but has no forced tool choice (:170).
- Edge deploy: `.github/workflows/supabase-functions-deploy.yml` — push path frozen after the staging-first cutover;
  only `workflow_dispatch` deploys, to project `inmkhvwdcuyhnxkgfvsb` (the only Supabase project; staging frontends
  use it too). There is no staging Supabase.

## Design
1. **generate-enhanced-recommendations: Bedrock only.**
   - Static import of `generateContent`, `extractFunctionCall`, `extractTextFromResponse` from
     `../_shared/bedrock-bridge-client.ts`. Remove the `AI_BRIDGE_PROVIDER` branch, the `GOOGLE_GEMINI_API_KEY` read and
     the gemini-client import. No fallback to any other provider: a bridge failure returns the existing 500 with its
     error (fail loudly).
   - Pin `options.model = 'eu.anthropic.claude-sonnet-4-6'` (verified invokable, §2b), so the call does not depend on
     the unknown live `BEDROCK_MODEL_ID`.
   - Output handling (Claude does not always call an unforced tool; the bridge has no forced tool choice): the prompt
     tells the model to call `score_recommendations`. Raw matches = `extractFunctionCall(r)?.args.matches`; if there is
     no tool call, `JSON.parse` of the outermost `[`…`]` span of `extractTextFromResponse(r)` (text-only replies put the
     text in `parts[0]`, ai-bridge.ts:132-139); if neither yields an array, the existing "No tool call" error. This is
     output parsing, not a provider fallback. `generateContent('' , …)` keeps the ignored first positional argument for
     signature parity (bedrock-bridge-client.ts:91).
   - Hardening before the upsert, in ONE pure helper applied to whichever path produced the raw array (tool args or
     parsed text), so validation can never be skipped: keep only matches whose `id` is in the candidate set and whose `type` matches that
     candidate, clamp `score` to 0..1, drop `< 0.3`, cap `reasons` at 3 strings of ≤ 200 chars. A hallucinated id
     can no longer reach `event_recommendations` / `group_recommendations`. The candidate set is DB-sourced in the same
     request (`global_community_events` upcoming, `global_community_groups`, index.ts:37-53, read through the member's
     RLS), so id-in-candidate-set means the row exists and is visible to that member.
   - Everything else unchanged: same auth (user JWT, RLS upserts), same request/response shape, same locale wrapper.
2. **Retire generate-recommendations.** Delete `supabase/functions/generate-recommendations/` and its
   `config.toml` block. The deployed copy is removed by the owner (`supabase functions delete generate-recommendations
   --project-ref inmkhvwdcuyhnxkgfvsb`, or the dashboard) after merge; the deploy workflow cannot delete. Until then it
   is unreachable from the app and fails on the dead Gemini key. Out-of-repo invokers checked: no `cron.job` command
   references it (read-only query 2026-10-05), and no reference in vitana-platform (gateway, workflows, migrations).
   Before deleting, the owner's edge-function invocation log for it (last 30 days) is checked; expected empty.
3. **Model pin is deliberate**: the edge function names its model so it never depends on an unverified gateway
   default; changing it later is a one-line edit in this function.
4. **AI_BRIDGE_PROVIDER stays as is** for the other four functions (not in scope; each is its own decision).

## Preconditions before the edge deploy (owner, read-only)
- `GATEWAY_SERVICE_TOKEN` is set as a Supabase edge-function secret with the same value as the production gateway's
  (`supabase secrets list` shows the name). Without it the function fails loudly ("GATEWAY_SERVICE_TOKEN not
  configured"), never silently.
- `GATEWAY_URL` unset → the client calls `https://gateway.vitanaland.com/api/v1` (production gateway), which serves
  `/ai-bridge/generate` today.

## Tests
- Vitest static contract (`src/lib/edge-functions-no-google.test.ts`): generate-enhanced-recommendations imports only
  `bedrock-bridge-client`, has no `gemini-client`, `GOOGLE_GEMINI_API_KEY`, `generativelanguage` or
  `AI_BRIDGE_PROVIDER`; pins the model; generate-recommendations folder and config block are gone.
- Vitest unit test of the extracted pure helper `supabase/functions/_shared/recommendation-matches.ts` (pure TS, no
  Deno globals; imported by the test from `src/lib/` by relative path, the same way `src/lib/bedrock-bridge-client.test.ts`
  imports `_shared/bedrock-bridge-client.ts`): tool-call path, JSON-text path,
  neither → null; unknown ids and type mismatches dropped; score clamped; threshold; reasons capped.
- Existing `src/lib/bedrock-bridge-client.test.ts` stays green; `npm test`, lint, build.
- Staging verify: no staging Supabase exists and edge functions are not part of the frontend deploy, so the
  `staging-tests.json` manifest covers the frontend build (existing smoke suite, unchanged UI). The edge change is
  verified after the owner-approved deploy, read-only: `get_edge_function` shows the deployed source has the Bedrock
  import and no Gemini import, and edge logs show no `GOOGLE_GEMINI_API_KEY` error. No test invokes the function (it
  writes recommendation rows for the caller).

## Deferred
- Events/groups created by test/service accounts are not filtered from the candidates (the function reads through the
  member's RLS and cannot read the allowlists). They are content items already listed on the events/groups pages, not
  member profiles; tracked as a follow-up to the rule-45 fix.

## Rollout
Merge → owner yes → `workflow_dispatch` of supabase-functions-deploy with `functions=generate-enhanced-recommendations`
→ read-only verification above → owner deletes the deployed generate-recommendations.

## Rollback
Re-deploy the previous version of the function from git (it only ever reached a dead Gemini key, so rollback restores
a non-working state; preferred action on a Bedrock problem is to fix forward).
<!-- plan:end -->


## Planner responses — round 1
- F1 ACCEPTED — one pure helper normalises/validates the raw array from either path (tool args or parsed text);
  parsing is `JSON.parse` of the outermost `[`…`]` span.
- F2 ACCEPTED — call passes `''` as the ignored first argument.
- F3 — agreed, no change (tool call takes priority; text-only replies put text in parts[0]).
- F4 ANSWERED — candidates are DB-sourced in the same request (index.ts:37-53, via the member's RLS), so
  id-in-candidate-set implies the row exists and is visible; stated in the plan.
- F5/F6 — no action.
- Q1 — deliberate pin (design item 3).
- Q2 — `supabase/functions/_shared/recommendation-matches.ts`, pure TS, Vitest imports it by relative path like
  bedrock-bridge-client.test.ts.
- Q3 — no `cron.job` references it; no reference in either repo; the owner checks its invocation log before deleting.
- Added (self-found): test-account-created events/groups are not filtered — deferred to a rule-45 follow-up (content
  items, not member profiles).
