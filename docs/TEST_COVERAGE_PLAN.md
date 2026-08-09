# Vitanaland Frontend — Test Coverage Plan

**Status:** BOOTSTRAP-TEST-COVERAGE baseline — created 2026-07-13
**Master plan:** `vitana-platform/docs/TEST_COVERAGE_PLAN.md` (cross-repo
schedule, backend inventory, escalation rules). This file carries the
frontend-specific detail.

---

## 1. Where we started (inventory, 2026-07-13)

- **0 real unit tests, no test runner.** The two `src/tests/*.test.ts`
  files are runtime self-check modules imported by `feature-flags.ts`,
  not test suites.
- 1,358 source files under `src/`: 278 pages, 712 components (55 dirs),
  189 hooks, 103 lib modules, 16 context providers, 4 stores/state files.
- 74 Supabase edge functions — no tests.
- Existing automation: ad-hoc Playwright/Node regression scripts
  (`npm run test:orb-stop`, `test:universal-cart`, …), ESLint i18n gates,
  one scheduled LLM i18n audit. **No CI job ran unit tests.**

## 2. What this branch adds (Phase 0)

- **Vitest + @testing-library/react + jest-dom + jsdom** installed;
  `vitest.config.ts` (separate from `vite.config.ts` so test tooling can
  never affect the production build); `src/test/setup.ts`.
- npm scripts: `npm test` / `test:unit` / `test:unit:watch` /
  `test:unit:coverage`.
- Seed suites (5 files, 26 tests, ~2 s):
  - `src/lib/permissions.test.ts` — RBAC permission derivation
  - `src/lib/tenant-display.test.ts` — tenant brand resolution
  - `src/config/domain-tenant-mapping.test.ts` — domain→tenant map invariants
  - `src/lib/format-money.test.ts` — locale-aware money formatting
  - `src/lib/messageDateSeparators.test.ts` — message date separators
- **`.github/workflows/UNIT-TESTS.yml`** — runs Vitest on every PR, every
  push to `main`, nightly at 03:47 UTC, and on manual dispatch.

Conventions: co-locate tests next to the module (`src/lib/foo.test.ts`).
`src/tests/**` stays excluded (runtime self-checks, not suites). Mock the
i18n singleton / supabase client at the module boundary with `vi.mock`.

## 3. Build-out schedule (frontend slices of the master plan)

| Phase | Deliverable | Modules | Status |
|---|---|---|---|
| **3 — Auth, roles, tenancy (P0)** | Route-guarding and role logic can never silently regress | `src/context/AuthProvider.tsx`, `src/components/ProtectedRoute.tsx`, `src/routes/guards/AdminGuard.tsx`, `src/hooks/useRole.tsx`, `src/hooks/usePermissions.ts`, `src/hooks/useTenant.tsx`, `src/components/TenantDetector.tsx`, `src/lib/guest-auth.ts`, `src/lib/oauthErrors.ts`, `src/hooks/useSupabaseOAuthSignIn.ts` | ☐ |
| **8a — i18n & locale (P1)** | German-first UI helpers locked down | `src/lib/i18n-toast.ts`, `src/lib/locale-format.ts`, `src/lib/i18n-helpers.ts`, `src/contexts/LanguageContext.tsx` | ☐ |
| **8b — Wallet & commerce (P1)** | `src/lib/wallet-gateway-client.ts`, `src/lib/exchangeRates.ts`, `src/hooks/useWallet.ts`, `useWalletGateway.ts`, `useWalletRealtime.ts`, `src/lib/universal-cart-client.ts` | | ☐ |
| **8c — Messaging & offline (P1)** | `src/lib/messageStatus.ts`, `src/hooks/useMessages.ts`, `usePaginatedMessages.ts`, message cache; `src/context/OfflineProvider.tsx`, `src/lib/localStorage.ts`, `src/lib/calendarPendingQueue.ts`, `src/lib/sseConnectionManager.ts`/`useSSE.ts` | | ☐ |
| **8d — ORB/voice, autopilot, memory, health (P1)** | `src/lib/orbActivate.ts`, `orbWidgetSession.ts`, `orbWidgetReady.ts`, `useOrbVoiceWidget.ts`, `useOrbFrontDoor.ts`, `useOrbSuppression.ts`; `use-autopilot.ts`, `useAdminAutopilot.ts`, `useAutopilotComplete.ts`; `useMemoryMetadata.ts`, `diary-index-sync.ts`; `vitanaIndex.ts`, `vitana-projection.ts`, `goalTrend.ts`, `planSummaryCalculator.ts`, `useHealthLogger.ts`, `useHealthPlans.ts`; `news-feed-ranker.ts`, `parseCalendarNL.ts`, `feature-flags.ts` | | ☐ |
| **10 — Edge functions (P2)** | Deno tests: `supabase/functions/_shared/llm-locale.ts` first (the locale rule every function must obey), then stripe-webhook + checkout variants, ai-chat, autopilot-profile, search-memories/generate-memory-embedding/reinforce-memory, set_active_tenant, vertex-live/vitanaland-live | | ☐ |
| **11 — Coverage ratchet (P2)** | Coverage thresholds in `vitest.config.ts` at measured baseline, ratchet upward; consider making UNIT-TESTS a required check | | ☐ |

Also fold the nine `scripts/*-regression.mjs` Node scripts into Vitest
suites over time so one runner owns everything.

## 4. Definition of done per phase

- Suites green locally (`npm test`) and in `UNIT-TESTS.yml` (including the
  nightly run).
- New logic modules land WITH tests from now on — reviewers should reject
  untested `src/lib`/`src/hooks` changes the same way untranslated strings
  are rejected.
- Touched area ≥80% line coverage.
