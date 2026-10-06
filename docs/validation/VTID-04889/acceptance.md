# VTID-04889 — D4: event/group recommendations on Bedrock only; Gemini function retired

Owner decision 2026-10-05: "move to bedrock" (Gemini is forbidden Google, platform CLAUDE.md ALWAYS 10a–10c). Plan
sparred (2 rounds, converged) and owner-approved — `plan-sparring.md`.

AC-1: `generate-enhanced-recommendations` calls Claude only through `_shared/bedrock-bridge-client.ts` (gateway
`/api/v1/ai-bridge/generate`); no `gemini-client`, `GOOGLE_GEMINI_API_KEY`, `generativelanguage` or
`AI_BRIDGE_PROVIDER` remains; a bridge failure returns the existing 500 (no fallback).
TEST: src/lib/recommendation-matches.test.ts
AC-2: The model is pinned to `eu.anthropic.claude-sonnet-4-6` (verified invokable), independent of the gateway's
`BEDROCK_MODEL_ID`.
TEST: src/lib/recommendation-matches.test.ts
AC-3: Whether the model calls `score_recommendations` or answers with a JSON array in text, the same validator runs
before any upsert: only candidate ids read in this request with matching type, score clamped to 0..1, threshold 0.3,
at most 3 reasons of ≤200 chars, one row per candidate; neither path → the existing "No tool call" error.
TEST: src/lib/recommendation-matches.test.ts
AC-4: The uncalled, Gemini-only `generate-recommendations` is removed from the repo and `supabase/config.toml`.
TEST: src/lib/recommendation-matches.test.ts
AC-5: Everything else unchanged: member JWT and RLS upserts, request/response shape, the locale wrapper.
TEST: src/lib/recommendation-matches.test.ts

## Deploy (after merge, owner yes required)

Edge functions are not part of the frontend deploy and the push path is frozen; the change goes live only by a manual
`supabase-functions-deploy.yml` dispatch with `functions=generate-enhanced-recommendations`, to the single Supabase
project. Preconditions: `GATEWAY_SERVICE_TOKEN` set as an edge-function secret (same value as the production
gateway's). Read-only verification afterwards: `get_edge_function` shows the Bedrock import and no Gemini import; edge
logs show no `GOOGLE_GEMINI_API_KEY` error. The owner deletes the deployed `generate-recommendations` after checking
its invocation log (`supabase functions delete generate-recommendations --project-ref inmkhvwdcuyhnxkgfvsb`).

## Deferred

Events/groups created by test/service accounts are not filtered from the candidates (the function reads through the
member's RLS and cannot read the allowlists) — follow-up to VTID-04888.
