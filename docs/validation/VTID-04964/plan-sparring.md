# VTID-04964 — plan sparring record

- **Plan hash (sha256 of the text between the plan markers):** `61f7cfe1677e1832c9e9eb3f4d5f72bd26dec11b9f9ca3abd6569ebd29237540`
- **Sparring session:** `plan_sparring_sessions.id = d762f29e-a7c5-4806-8011-fa5181f0703e`
- **Partner:** `plan-sparring-partner` agent (independent, read-only; saw only the plan file)
- **Verdict:** CONVERGED
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-07 — "Yes all four" (Gate 1, all four plans of the push-notification report). Binding exafy_admin click pending (`POST /api/v1/plans/spar/:id/approve`).

## Final plan

<!-- plan:begin -->
**Change class:** light
**Repo:** exafyltd/vitana-v1
**Scope:** `supabase/functions/appilix-push/index.ts` only.

## Problem (verified)
- `appilix-push` is deployed on the live Supabase project with `verify_jwt=false` (supabase/config.toml:162-163) and performs no caller check. Anyone with the URL can push arbitrary title/body/`open_link_url` to any member's phone by user id via our Appilix keys → phishing / spam vector.
- It has had no caller since the DB trigger was dropped (migration 20260508000100). The gateway calls the Appilix API directly. Edge logs: 0 invocations in the last 24h.
- The drop-trigger migration kept it deployed "so any external caller (if any) keeps working" — none has been identified.

## Change
Replace the handler with a fail-closed stub with no imports (Deno.serve only): `OPTIONS` → 204 with the existing CORS headers; every other request returns `410 Gone` (same CORS headers) `{error:"appilix-push retired; pushes are sent by the gateway"}` and logs `method`, `user-agent` and origin (no body, no PII) so any unexpected caller becomes visible. The Appilix secrets are no longer read. `config.toml` is left unchanged (no auth-config change). Function directory kept so the deployed version is replaced rather than orphaned (deleting the dir does not delete a deployed function).

Why a stub instead of `supabase functions delete`: reversible by redeploying, uses the existing deploy workflow, and surfaces callers.

## Deploy
Edge functions reach the live project only via manual `supabase-functions-deploy.yml` dispatch (staging-first freeze) → owner approval required; dispatch with `functions=appilix-push` only.

## Verification
- `deno check` if available, else `npx eslint supabase/functions/appilix-push/index.ts`; the stub is ~25 lines and reviewed by inspection.
- No sends. Post-deploy read-only: edge logs show the new version; zero invocations expected. No probe request against production (absolute rule) — the 410 behaviour is proven by reading the deployed source via `get_edge_function`.

## Follow-up (not here)
Delete the function and its `config.toml` block after 30 days with zero invocations (separate VTID).

## Rollback
Redeploy previous version.
<!-- plan:end -->

## Sparring rounds (partner findings, condensed from the partner's own wording)

### Round 1 — CONVERGED
Verified premises: verify_jwt=false at config.toml:162-163 (TRUE); no caller check in index.ts (TRUE); trigger dropped by 20260508000100 (TRUE); gateway calls appilix.com directly at notification-service.ts:485 (TRUE); no caller of functions/v1/appilix-push in either repo (TRUE); live deploy only via manual dispatch (TRUE).
- F1 [minor] Keep the OPTIONS/CORS preflight and CORS headers on the 410.
- F2 [minor] Drop the unused supabase-js import.
- F3 [minor] Name the type-check command.
- F4 [minor] The 30-day deletion follow-up needs its own VTID.
- Q1: was "0 invocations" checked in logs or inferred?

### Round 2 — CONVERGED
F1–F4 and Q1 closed. No new findings.

## Planner responses

## Planner responses — round 1
- F1 (keep OPTIONS/CORS) — ACCEPTED.
- F2 (drop supabase-js import) — ACCEPTED.
- F3 (type-check command) — ACCEPTED.
- F4 (follow-up needs own VTID) — ACCEPTED.
- Q1: verified, not inferred — Supabase `function_edge_logs` query grouped by function_id for the last 24h returned no rows for appilix-push's id (0f565956-…).
