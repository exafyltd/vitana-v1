# Plan sparring — VTID-05296 · lane `native-wave2-home-feed-news/community-hub`

**Verdict: CONVERGED**

## Record

This lane's plan was sparred and converged through the program's CI sparring
pipeline (`PLAN-SPAR.yml` in `exafyltd/vitana-platform`) as part of the
`native-wave2-home-feed-news` plan. The lane file's own log records the
outcome:

> ### 2026-10-21T11:19Z · ci-plan-spar · ready (VTID allocated)
> VTID-05296 allocated after policy approval (converged-auto-v1).

- **Partner:** independent CI sparring partner (Claude Opus on AWS Bedrock,
  `PLAN_SPARRING_MODEL`), read-only against plan + code.
- **Rounds:** converged within the standard cap; no finding left disputed.
- **owner approval:** policy approval `converged-auto-v1` (owner decision
  2026-10-14, VTID-05214/05218) stands in for Gate 1 for a CI-sparred plan
  that converged. Recorded here as the audit line; the mechanical gate is the
  `vtid_ledger` trigger that admitted VTID-05296.
- **plan hash:** the converged plan is the `native-wave2-home-feed-news` plan
  block at `exafyltd/vitana-platform`
  `origin/kiro/native-wave2-home-feed-news/plan` (lane front-matter
  `vtid: VTID-05296`, `updated: 2026-10-21T11:19Z`). The lane's scope globs and
  its 16 parity-ledger rows are fixed by that plan and recorded in
  `docs/validation/VTID-05296/setup-note.md`.

## Scope confirmed at build time

The build verified the plan's premises against the code before implementing:

- `@vitana/core` exposes no community/intents/search data hooks today, so the
  lane fetches through the injected native Supabase client (`getSupabase()`) and
  the native gateway (`getGateway()`) with the *same* PostgREST queries / gateway
  routes as the web screens — **no new member-listing query** is introduced, so
  the test/service allowlist exclusion (program NEVER rule 45) is inherited, not
  re-implemented. `packages/core/**` is **not** touched (the `home` lane owns the
  core extraction).
- The repo's own architecture test (`tests/ports.test.ts`) requires every
  `src/screens/**` and `app/**` file to reach the N2 kit only through
  `src/ports/*`. The lane therefore adds the primitives it needs
  (`Button`, `Badge`, `Card`, `Tabs`, `Skeleton`) to `src/ports/ui.tsx` and the
  screens import from the port — never `@vitana/ui` directly. `src/ports/ui.tsx`
  is an additive change recorded in scope.
- The resolver's native-route registry (`src/navigation/resolve.ts`
  `NATIVE_ROUTES`, enforced by `tests/navigation.test.tsx`) must list the new
  static routes, so the eight static routes are added there; dynamic routes
  (`/comm/groups/:id`, `/comm/my-groups/:id`, `/intents/match/:id`) are served
  by Expo Router file ranking, as the existing design intends.
