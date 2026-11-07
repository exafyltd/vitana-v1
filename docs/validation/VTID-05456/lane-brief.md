# Lane brief — VTID-05456 · native-wave2-health-biology-r3/health-plans-services

> Working summary. The spec lives in `exafyltd/vitana-platform` on branch `kiro/native-wave2-health-biology-r3/plan`:
> `.kiro/specs/native-wave2-health-biology-r3/` — `plan.md`, `tasks.md` (`<!-- lane: health-plans-services -->`,
> tasks 1–9), `lanes/health-plans-services.md`, `handoff.md`, `sparring/`. The spec has no `requirements.md` /
> `design.md`. If this file conflicts with the spec, the spec wins.
>
> Role: implementer (Kiro). Never allocate a VTID, merge/approve, dispatch a workflow, deploy, or write to a live
> system. The native app has no production profile.

## Lane identity
- **Lane:** `native-wave2-health-biology-r3/health-plans-services` · **VTID:** VTID-05456 (CI, `converged-auto-v1`)
- **Repo:** `exafyltd/vitana-v1` · **Seat:** exafyltd → **reviewer_seat:** hotmail
- **Branch:** `kiro/native-wave2-health-biology-r3/health-plans-services`
- **Worktree:** `/projects/sandbox/vitana-v1/.worktrees/native-wave2-health-biology-r3-health-plans-services`
- **Collab session:** `kiro-exafyltd-202611011658-9f52`
- **Sibling lanes:** `health-hub` (owns `apps/mobile/src/ports/health-sync.ts`, the dashboard, overlay and health data
  module) and `vitana-index-biology`; this lane touches none of their files.

## Goal
Port pillars, conditions, education (articles / videos / podcasts), plans (all + five pillar tabs) and services hub
(five sections) to native at 1:1 mobile-web parity; flip the 16 parity rows to `native`. Reads only.

## Rules applied
- Ports in `apps/mobile/src/ports/health-plans.tsx`; screens reach `@vitana/*` only through ports.
- Class-A web data through `@vitana/core/health-plans` (manifest + extract); `npm run gen:core` regenerated the
  closure and CI paths.
- Real Supabase reads in product code; tests use a double and assert the built requests.
- No UI the mobile web does not show; descoped items carry file:line evidence in `verification.md`.
- iOS IAP gates unchanged; the one purchase surface (Book Now → Stripe booking) is disabled, not ported.
- DE-first `healthNative` keys in 11 locales; logical start/end only.
