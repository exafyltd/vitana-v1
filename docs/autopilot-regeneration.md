# Autopilot on-demand regeneration — backend spec

> Status: **proposed** (backend not yet built). The card-preview + click-to-overview
> piece shipped on the frontend in PR #624; this doc covers the missing
> *regeneration* piece, which lives in the backend gateway.

## Context

- Frontend repo: `exafyltd/vitana-v1` (React/Vite).
- Backend: `exafyltd/vitana-platform` (`services/gateway/`).

**Desired product behavior:** after a user completes/clears *all* their active
Autopilot recommendations, Autopilot immediately produces a **new set**. The My
Journey "Autopilot" card shows the first 2–3 steps; tapping it shows the full
overview.

**Decisions locked:**

- Regeneration is **on-demand / immediate** (the moment the queue empties), not
  "wait for the next cron run."
- Backend work first; the small frontend resurfacing change is deferred until
  this exists.

> Paths below are **inferred** from the frontend's API calls and admin types
> (`src/hooks/use-autopilot.ts`, `src/hooks/useAdminAutopilot.ts`). Confirm exact
> filenames once `vitana-platform` is in scope.

## What the frontend already calls today

| Endpoint | Method | When |
|---|---|---|
| `/autopilot/recommendations/count?role=community` | GET | mount + every 5 min (count only) |
| `/autopilot/recommendations?status=new,activated&limit=20&role=community` | GET | popup open |
| `/autopilot/recommendations?status=new,activated,completed&limit=100` | GET | dashboard mount |
| `/autopilot/recommendations/{id}/activate?role=community` | POST | user taps "Go" |
| `/autopilot/recommendations/{id}/complete?role=community` | POST | user taps "Complete" |
| `/autopilot/recommendations/{id}/reject` | POST | dismiss / complete fallback |

Recommendation row shape the FE consumes (**must stay identical**):

```ts
{
  id, title, summary, domain, risk_level, impact_score, effort_score,
  estimated_duration, signal_type, status, contribution_vector,
  // + wave_id / horizon used for sequencing
}
```

Auth headers on every call: `Authorization: Bearer <token>`, `X-User-ID`,
`X-Vitana-Active-Role: community`.

## 1. Core: reusable generation service

Add `generateRecommendations(userId, role, opts)` in
`services/gateway/src/autopilot/`:

- Pull user context: goal/`life_compass`, Vitana Index pillar scores, recent
  activity, active **wave/horizon** config.
- Read `AutopilotSettings`: `enabled`, `max_recommendations_per_day`,
  `max_activations_per_day`, `allowed_domains`, `allowed_risk_levels`,
  `recommendation_retention_days`, `generation_schedule`.
- Emit N rows with status `new` in the exact shape above (including
  `contribution_vector` across the 5 pillars: nutrition, hydration, exercise,
  sleep, mental, and `wave_id`/`horizon`).
- **i18n hard rule (CLAUDE.md) — easiest thing to forget:** if generation calls
  an LLM, inject the user's locale via `services/gateway/src/i18n/llm-locale.ts`
  (`getUserLocale` + `buildLocalizedSystemPrompt`). Brand voice is German
  **du-form**. Without this, new recs ship in English in the DE UI.

## 2. Trigger: queue-empty → regenerate immediately

In the existing `/complete` and `/reject` handlers, after the write: recompute
the user's remaining **active** count (`new` + `activated`). If it just hit
**0**, kick generation. Prefer **async/enqueue + fast return** so the Complete
tap isn't slowed; the FE's poll/refetch surfaces the new batch.

## 3. Guards (these make "immediate" safe, not a runaway loop)

- **Daily cap:** honor `max_recommendations_per_day`. When hit, do **not**
  regenerate — return a real "all caught up for today" signal. Without this,
  complete → generate → complete loops forever.
- **Cooldown/debounce + per-user lock:** skip if a batch was generated in the
  last few minutes; serialize concurrent completes to avoid double-generation.
- **`enabled` + AI-data consent:** skip if Autopilot is disabled for the tenant
  or the user hasn't consented.
- **Wave gating:** if recs are wave/time-phased, pull the *next wave* rather than
  fabricating arbitrary items.

## 4. Explicit endpoint (so the FE can also force it / for testing)

```
POST /api/v1/autopilot/recommendations/generate?role=community
  → 200 { ok: true, generated: number, recommendations: [...] }
  → 200 { ok: true, generated: 0, reason: "daily_cap" | "disabled" | "cooldown" | "no_signals" }
```

Same auth headers as existing routes. **Idempotent** under the cooldown so a
double-tap can't double-generate.

## 5. Frontend integration (deferred — for reference)

Small follow-up once the backend ships: on empty queue after a completion (or
when the count poll drops to 0 after being >0), call `/generate`, show a
transient *"Preparing your next steps…"* state instead of the static "all caught
up," then refetch. Also make the 5-min poll refetch the **list** (not just the
count) so new recs surface in the card without a remount.

## Product decisions to confirm before coding

1. **Daily-cap behavior** when a user clears everything: honor the cap and show
   "all caught up for today" (**recommended**), or ignore it and keep
   regenerating?
2. **Trigger style:** auto on queue-empty, explicit FE-called `/generate`, or
   **both** (recommended — auto for seamlessness, endpoint for
   force-refresh/testing)?

## Testing

- **Unit:** generation respects caps/cooldown/consent/`enabled`; emits valid row
  shape + `contribution_vector`; locale injected into the LLM prompt.
- **Integration:** complete the last active rec → new `new` rows appear; a second
  immediate completion within the cooldown does not double-generate; cap reached
  → `generated: 0, reason: "daily_cap"`.
- **End-to-end (not just unit tests):** against the running gateway, complete all
  → `GET /recommendations?status=new,activated` returns the fresh set.

## Related

- Frontend card-preview / overview fix: PR #624 (`src/pages/AutopilotDashboard.tsx`).
- Frontend hook: `src/hooks/use-autopilot.ts`.
- Admin config types that reveal the server-side model:
  `src/hooks/useAdminAutopilot.ts` (`AutopilotSettings`, `AutomationCatalogEntry`,
  wave definitions).
