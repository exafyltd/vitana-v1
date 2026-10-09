# VTID-05008 — retire the old Supabase memory functions

The plan and every sparring round are in `plan-sparring.md`, including amendment A1.

## What this PR changes
- `supabase/functions/get-proactive-context/index.ts`: `supabase-js@2.39.3` → `@2.57.2`. The function calls `auth.getClaims()` (VTID-04926), and 2.39.3 does not have it, so a deploy of `main` would throw on every call.
- `supabase/functions/generate-proactive-greeting/index.ts`: the same one-line bump. **It is not deployed.** Its live June copy does not use `getClaims`; this only keeps `main` deployable.
- `src/lib/edge-functions-getclaims.vtid-05008.test.ts`: fails the build when a function calls `getClaims` with an older supabase-js. I confirmed it fails without the bump and passes with it.

## After merge (approved at Gate 1)
1. Dispatch `supabase-functions-deploy.yml` with `functions="fetch-user-context get-proactive-context"`, from the merge commit (`main`).
2. Check read-only: `list_edge_functions` shows new versions and `updated_at` for both. The Supabase function logs show no 5xx or TypeError for either over the following hours.
3. **Owner:** run `supabase functions delete <name> --project-ref inmkhvwdcuyhnxkgfvsb` for exactly these 8:
   `ai-chat`, `search-memories`, `reinforce-memory`, `generate-memory-embedding`, `extract-diary-insights`, `refresh-memory-metadata`, `extract-user-interests`, `analyze-visual-context`.
   **Do not delete:** `fetch-user-context` and `get-proactive-context` (just redeployed), or their live callers `generate-enhanced-recommendations`, `generate-proactive-greeting` and `generate-proactive-message`.
   `backfill-memory-embeddings` is also still live but was not in the handover list; it needs its own cleanup VTID.

## Read-only evidence (2026-10-09)
- No caller of the 8 in vitana-v1 `src/` or `supabase/`, nor in vitana-platform `services/` or `scripts/`.
- The live `fetch-user-context` (v344) and `get-proactive-context` (v237) date from 2026-04-06.
- `main`'s copies read none of the tables migration `20260924220000` dropped, and every table they read exists live.
