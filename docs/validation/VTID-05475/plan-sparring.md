# VTID-05475 — plan sparring record (welcome-finish-r2)

Copied from exafyltd/vitana-platform `.kiro/specs/welcome-finish-r2/sparring/` on origin/main. CONVERGED, policy-approved by `converged-auto-v1`; owner approval recorded by policy (converged auto, no Gate 1). Final plan hash `be1e29771527a2f52bacac3a8a248bf11b35c4ffaa38738f49b6c6edd47d3ecd`. VTIDs: VTID-05475, VTID-05476, VTID-05477, VTID-05478.

---

## round-1.md

# Sparring round 1 — in_progress

Session: `2772d043-41a6-46ed-8e76-e676a560d911` · plan hash `b7d381f2e11063ecbdf6265d2a6db0a2a969b2b210ab8390281d720a9fff3726`

## Summary

The plan is generally well-structured with good fail-closed reasoning and a clear owner decision. Most premises about the existing code check out. I found one major issue around the deploy-vs-migration ordering for the `explicit-intro-choice` lane and one concern about tenant scoping in the new gateway endpoint.

## Findings

### R1-F1 [major]

The `explicit-intro-choice` lane's code changes (modifying `setCommunityIntroOptIn` to write both `community_intro_opt_in` and `community_intro_choice_at`) will deploy before the migration that creates `community_intro_choice_at` is applied (the migration is an owner stop). During this window, every call to `setCommunityIntroOptIn` will fail because PostgREST rejects writes to non-existent columns. This breaks the existing Settings → Privacy community intro toggle for ALL users, not just new signups. The plan acknowledges the window but characterises it as 'fail safe, nobody is introduced', which understates the impact: the toggle that existing users already have stops working entirely. The OnboardingNameForm path catches the error non-fatally (line 168), but the CommunityIntroToggle mutation (line 28-34) surfaces a toast error and silently drops the write, so no user can change their setting until the migration is applied.

- `exafyltd/vitana-v1:src/lib/community-intro.ts:27` — export async function setCommunityIntroOptIn(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("global_community_profiles")
    .update({ [COMMUNITY_INTRO_COLUMN]: value })
    .eq("user_id", userId);
  if (error) throw error;
}
- `exafyltd/vitana-v1:src/components/settings/CommunityIntroToggle.tsx:27` — const mutation = useMutation({
  mutationFn: async (next: boolean) => {
    if (!userId) throw new Error("Not authenticated");
    await setCommunityIntroOptIn(userId, next);
    return next;
  },
  onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  onError: () => notifyError("screens.settings.communityIntroSaveFailed"),
});

Suggestion: Either (a) apply the migration BEFORE deploying the code changes (reverse the current implied ordering), or (b) make the code change backward-compatible: write `community_intro_choice_at` only if the column exists (e.g. catch column-not-found errors and retry writing only `community_intro_opt_in`), or (c) split the code change into two deploys — first the migration, then the code that writes the new column. The plan should specify a concrete ordering guarantee.

### R1-F2 [major]

The plan's endpoint spec says the query includes 'member's tenant' as a filter, but the existing browser queries in useAllNewsFeed.ts and useNewsFeed.ts do NOT explicitly filter by tenant — they query `global_community_profiles` under client-side RLS without any tenant_id filter. The new gateway endpoint will use the service-role Supabase client (no RLS), so it must either replicate the tenant scoping that RLS provides or intentionally omit it. The plan does not specify how tenant_id filtering is applied in the endpoint. If the table is truly global (no tenant RLS), adding a tenant filter changes visible membership. If RLS does restrict by tenant, omitting the filter in the gateway leaks cross-tenant data.

- `exafyltd/vitana-v1:src/hooks/useAllNewsFeed.ts:201` — supabase
  .from("global_community_profiles")
  .select("user_id, display_name, avatar_url, bio, created_at, community_intro_opt_in")
  .eq("is_visible", true)
  .eq(COMMUNITY_INTRO_COLUMN, true)
  .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order("created_at", { ascending: false })
  .limit(5)
- `exafyltd/vitana-platform:services/gateway/src/routes/community-members.ts:20` — import { Router, Request, Response } from 'express';
import { requireAuth, requireTenant, AuthenticatedRequest } from '../middleware/auth-supabase-jwt';
import { getSupabase } from '../lib/supabase';
import { fetchExcludedTestServiceAccountIds } from '../lib/excluded-test-service-accounts';

Suggestion: Determine the RLS policy on `global_community_profiles` and state explicitly whether the gateway endpoint filters by `tenant_id` or not. If the table is truly global and all tenants see all profiles today, the endpoint must NOT filter by tenant (and the spec should remove 'member's tenant'). If RLS does restrict by tenant, the endpoint must add an explicit `.eq('tenant_id', identity.tenant_id)` filter since it uses the service-role client.

### R1-F3 [minor]

The plan references `search_mention_candidates` in vitana-v1 migration `20261006140000` as a precedent for SECURITY DEFINER database functions, but code search found no results for this migration or function name in vitana-v1. The reference may be stale or wrong. This is used only as a justification for the alternative approach (endpoint over migration), not as something being modified, so it doesn't affect correctness.

- `exafyltd/vitana-v1:src/hooks/useAllNewsFeed.ts:201` — supabase
  .from("global_community_profiles")
  .select("user_id, display_name, avatar_url, bio, created_at, community_intro_opt_in")
  .eq("is_visible", true)
  .eq(COMMUNITY_INTRO_COLUMN, true)
  .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .order("created_at", { ascending: false })
  .limit(5)

Suggestion: Verify the migration name/number and correct the reference if needed, or remove it if the migration was never merged.

## Next

Planner: answer every finding above in `sparring/responses-1.md` as one ```json block
`[{"finding_id": "...", "disposition": "accepted|rejected|deferred", "rationale": "...", "deferred_to": "..."}]`,
update `plan.md` (the plan block), commit both and push. That push starts the next round.

---

## responses-1.md

```json
[
  {"finding_id":"R1-F1","disposition":"accepted","rationale":"Confirmed: exafyltd/vitana-v1 src/lib/community-intro.ts:27-33 throws on any update error, and CommunityIntroToggle.tsx:27-34 surfaces it as a toast, so a write of a not-yet-existing column would break the toggle until the owner-approved migration is applied. Plan §4 (explicit-intro-choice) and §5 now make setCommunityIntroOptIn backward compatible: it writes both columns and, on an unknown-column error (PGRST204 or 42703, surfaced by supabase-js as error.code/error.message on the result; same pattern as exafyltd/vitana-platform services/gateway/src/routes/chat-repository.ts:101-119), retries once with only community_intro_opt_in; other errors are still thrown. The registration buttons use the same function. Tests cover both paths (tasks.md D2, acceptance). Until the migration is applied new signups keep the old default true; 'nobody until Yes' holds for new signups only after the migration is applied, which stays an owner stop (collaboration.md 7d). Stated in plan §5, §6 and the lane acceptance.","deferred_to":""},
  {"finding_id":"R1-F2","disposition":"accepted","rationale":"Evidence: global_community_profiles has no tenant_id column (exafyltd/vitana-v1 supabase/migrations/20250917153624_22b8e9be-eb29-477c-974b-87a609943321.sql:5-16) and its SELECT policy is is_community_user() AND is_visible (same file :165-167), which is not tenant-scoped; a search of supabase/migrations on origin/main finds no later tenant column or policy for this table. So the endpoint must NOT filter by tenant: it mirrors the browser query exactly (same rows every community member sees today) and adds only the exclusions, the caller and fail-closed. The phrase 'member's tenant' is removed from plan §3; requireTenant stays as an auth gate only, like exafyltd/vitana-platform services/gateway/src/routes/community-members.ts:78, which also lists the global directory (it uses the fail-open helper; the new route uses the strict one).","deferred_to":""},
  {"finding_id":"R1-F3","disposition":"accepted","rationale":"The reference was imprecise: the function exists in exafyltd/vitana-v1 supabase/migrations/20261006140000_vtid_04926_mentions.sql:22-24 (SECURITY DEFINER, restricted to users sharing a tenant via user_tenants at :50-51). Plan §2.2 now cites the exact file and lines. It stays only as the rejected alternative.","deferred_to":""}
]
```

---

## round-2.md

# Sparring round 2 — converged

Session: `2772d043-41a6-46ed-8e76-e676a560d911` · plan hash `be1e29771527a2f52bacac3a8a248bf11b35c4ffaa38738f49b6c6edd47d3ecd`

## Summary

All three R1 findings were accepted and properly addressed in the revised plan. The backward-compatible write pattern (retry on PGRST204/42703) is well-precedented in the codebase. The tenant filter clarification is correct: `global_community_profiles` has no `tenant_id` and its RLS is not tenant-scoped. The mentions migration reference is now accurate. One new minor finding regarding the backfill interaction with the pre-migration window.

## Findings

### R2-F1 [minor]

The backfill in the `explicit-intro-choice` migration (`SET community_intro_opt_in = false WHERE community_intro_choice_at IS NULL AND community_intro_opt_in = true`) will silently revert any explicit opt-in made by a user during the window between code deploy and migration apply. During that window, the backward-compatible fallback writes only `community_intro_opt_in = true` (no `community_intro_choice_at` marker). The backfill then treats those rows as 'no recorded choice' and sets them to false. A user who taps 'Yes, introduce me 👋' during registration or toggles ON in Settings during this window loses their explicit choice when the migration is applied. The plan §6 acknowledges the window but does not explicitly state that explicit opt-ins (not just defaults) are reverted. With the current community size (253 rows, 2 true) the blast radius is small and bounded by the owner stop.

- `exafyltd/vitana-v1:src/lib/community-intro.ts:27` — export async function setCommunityIntroOptIn(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("global_community_profiles")
    .update({ [COMMUNITY_INTRO_COLUMN]: value })
    .eq("user_id", userId);
  if (error) throw error;
}
- `exafyltd/vitana-platform:services/gateway/src/routes/chat-repository.ts:116` — /** A column this lane adds does not exist yet (migration not applied). */
export function isMissingColumn(err: PgError, column: string): boolean {
  if (!err) return false;
  if (err.code !== 'PGRST204' && err.code !== '42703') return false;
  return (err.message || '').includes(column);
}

Suggestion: Explicitly document in the plan §6 and the lane PR that any explicit opt-in during the pre-migration window will be reverted by the backfill, so the owner is aware when approving the apply. Alternatively, consider having the backfill check `updated_at > created_at` as a heuristic for 'user touched this row' to preserve those rows, though this adds complexity for a very small window.

## Acknowledgements of earlier responses

- R1-F1: acknowledged — Accepted and addressed. The backward-compatible retry pattern (PGRST204/42703) is well-precedented in chat-repository.ts:116-121 and the plan now specifies both the fallback behavior and test coverage for both paths.
- R1-F2: acknowledged — Accepted and addressed. The plan correctly removed 'member's tenant' from the spec and confirmed `global_community_profiles` has no tenant_id column and no tenant-scoped RLS. requireTenant stays as auth gate only, matching the existing community-members.ts:78 pattern.
- R1-F3: acknowledged — Accepted and addressed. The reference is now precise: `20261006140000_vtid_04926_mentions.sql:22-24`, confirmed to exist with SECURITY DEFINER and tenant restriction via user_tenants at lines 49-53.

---

## verdict.md

# Verdict — welcome-finish-r2

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-02T15:56:49.043+00:00.
Session `2772d043-41a6-46ed-8e76-e676a560d911` · final plan hash `be1e29771527a2f52bacac3a8a248bf11b35c4ffaa38738f49b6c6edd47d3ecd`.
VTIDs: VTID-05475, VTID-05476, VTID-05477, VTID-05478
