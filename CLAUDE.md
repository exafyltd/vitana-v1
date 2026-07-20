# Vitana V1 — Community App

## 🚫 ABSOLUTE RULE — NEVER TEST AGAINST PRODUCTION (NO EXCEPTIONS)

**Testing against production is FORBIDDEN at all times. There is no scenario,
no justification, and no "I'll clean it up afterwards" that makes it OK.**

This applies to Claude and to every human and every agent working in this repo.

Specifically, you must **NEVER**, against any live/production service —
including the production Supabase project (`inmkhvwdcuyhnxkgfvsb`), the
production gateway (`gateway.vitanaland.com`), or any production Cloud Run
service or live user-facing endpoint:

- Run tests, probes, latency measurements, load tests, or "quick checks".
- INSERT, UPDATE, DELETE, or send any data (chat messages, group messages,
  notifications, records of any kind), even with a test account.
- Run scripts (`scripts/*.mjs`), Playwright, curl, or SDK calls that mutate
  state or post to real groups/users.
- Treat the documented test user or auth snippets as permission to write —
  they are NOT. They exist for narrow, read-only verification only.
- Rationalize that cleanup, a temp tag, or a "self-message" makes it safe.
  It does not. The rule is absolute.

**If a change needs runtime verification:**
1. Use an **isolated / staging / local** environment that the user has
   explicitly designated for testing — never production.
2. If no safe environment exists, **deliver the test script for the user to
   run themselves** and STOP.
3. When in any doubt, **stop and ask first.** Writing to a shared/live system
   is a destructive, outward-facing action and requires explicit approval.

> Why this rule exists: an agent ran latency "tests" against production —
> inserting rows into the live `chat_messages` table and posting junk messages
> into a real community group that real members could see. Never again.

## Overview

VITANA community app (branded "MAXINA - Longevity Community"). React/Vite SPA with 551+ screens spanning community, health, AI, messaging, wallet, and admin features.

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5 (SWC plugin)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand + TanStack React Query v5
- **Auth:** Supabase Auth (dual JWT — platform + community)
- **Routing:** React Router v6 (lazy-loaded routes)

## Build & Run

```bash
npm run dev       # Dev server on port 8080
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Deployment (Dual — Parallel)

This app currently deploys to **two** hosts simultaneously:

| Host | URL | Trigger | Status |
|------|-----|---------|--------|
| **Cloud Run** | `community-app` service in `lovable-vitana-vers1` | `.github/workflows/DEPLOY.yml` on push to `main` | New (being verified) |
| **Lovable CDN** | `vitana-lovable-vers1.lovable.app` | Auto-deploy on push to `main` | Legacy (fallback) |

Once Cloud Run is verified working, Lovable will be decommissioned.

### Staging-first cutover (effective Mon 8 Jun 2026, 10:00 Europe/Berlin)

Auto deploy-to-live is **time-gated**. Before the cutover instant, a push to
`main` deploys the **live** `community-app` as before. At/after it, the
automatic (push) path in `DEPLOY.yml` is **frozen** (via its `cutover_gate`
job): frontend changes auto-deploy to **staging** (`community-app-staging` via
`STAGE-DEPLOY-FRONTEND.yml`, on `preview.vitanaland.com`), and production is
reached only via:

1. the single **PUBLISH** button in the backend Command Hub, or
2. a deliberate manual `workflow_dispatch` of `DEPLOY.yml` (requires a `reason`)
   — the documented exception.

`supabase-functions-deploy.yml` is gated the same way (no staging-functions
auto-deploy yet, so it is freeze-only on the auto path post-cutover; ship via
manual dispatch). `STAGE-DEPLOY-FRONTEND.yml` is **not** gated — staging deploys
always run. The backend half of the cutover lives in `exafyltd/vitana-platform`.

### Per-PR preview deploys

Every open PR that touches frontend files gets its **own** Cloud Run service
(`community-app-pr-<number>`), independent of `community-app-staging`:

- `.github/workflows/PREVIEW-DEPLOY-FRONTEND.yml` auto-deploys on every push
  to the PR and posts/updates a PR comment with the preview URL.
- `.github/workflows/PREVIEW-TEARDOWN-FRONTEND.yml` deletes the service when
  the PR closes (merged or not).

**Do not manually `workflow_dispatch` `STAGE-DEPLOY-FRONTEND.yml` against a
feature branch.** That deploys the *shared* `community-app-staging` /
`preview.vitanaland.com` service — if two branches do this back-to-back,
each overwrites the other's verification (this happened and reverted a
merged fix on staging). Use the PR's own preview URL instead; it can't be
clobbered by other branches. `STAGE-DEPLOY-FRONTEND.yml` should only ever
run via its normal push-to-`main` trigger.

## Project Structure

```
src/
├── pages/          # Route page components (lazy-loaded)
├── components/     # 85+ component directories
│   └── ui/         # shadcn/ui primitives
├── hooks/          # 60+ custom hooks
├── contexts/       # React context providers
├── lib/            # Utilities (supabase client, etc.)
├── types/          # TypeScript type definitions
└── App.tsx         # Main router (1200+ lines, all routes)
```

## Environment

`.env` contains `VITE_*` vars baked at build time (public keys only):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase connection
- `VITE_GATEWAY_URL` — Backend API (`gateway-*.run.app`)
- `VITE_OPERATOR_BASE_URL` — Operator API
- `VITE_DEV_HUB_ENABLED` — Dev Hub feature flag

## Multi-Repo Context

This is the **frontend** repo. The backend is in `exafyltd/vitana-platform`:
- **Backend API + Command Hub:** `vitana-platform/services/gateway/`
- **This app calls:** `VITE_GATEWAY_URL` for all API requests
- **Both repos** should be available in every Claude Code session

## Testing

**Test user UUID:** `a27552a3-0257-4305-8ed0-351a80fd3701`
Use this user when an authenticated user is needed for testing (e.g., Playwright screenshots, API calls, profile checks).

## Key Patterns

- **Mobile-first:** `useIsMobile()` hook, MobileAppShell wrapper
- **Role-based:** Community, Professional, Staff, Admin, Dev roles
- **Multi-tenant:** TenantProvider for portal-specific branding
- **Offline support:** OfflineProvider + LocalStorage query persistence
- **Auth flow:** Supabase Auth → role check → route guard

## i18n Hard Rule (must follow)

Every string a user can see must come from `src/i18n/<locale>/**`. The
ESLint rules `i18n/no-raw-jsx-text` and `i18n/no-raw-toast-arg` are at
**error** level — any new hardcoded user-visible string fails the build.

- New strings: add to the German shard FIRST (`src/i18n/de/<screen>.json`),
  then mirror to `en/`.
- JSX text & attributes: `{t('screens.<ns>.<slug>')}` from `@/lib/i18n-toast`.
  For text with placeholders: `t('key', { name })`.
- JSX with nested elements: wrap with `<Trans i18nKey="..." values={{...}}>`
  from `@/components/Trans`.
- Toasts: `notify(...)`/`notifyError(...)` from `@/lib/i18n-toast`. Never raw
  `toast()`/`sonner.toast()` with English.
- Backend-supplied UI text: gateway ships `{ key, params }`, never raw strings.
- New languages: run `node scripts/translate-keys.mjs --provider=deepseek
  --locale=<code>` (or `--provider=gemini`). Mark `_pending_review` until
  reviewed via `/dev/i18n-review`.
- Run `npm run i18n:inventory` before opening a PR; commit the regenerated
  `docs/SCREEN_INVENTORY.md`.

### Dates & numbers — never `toLocaleX` / `date-fns format` directly

Hardcoded `'en-US'` or omitted locale args render English month/weekday names
in the German UI even when the surrounding string is translated. Use the
helpers from `@/lib/locale-format`:

- `fmtDate(d, opts?)` instead of `d.toLocaleDateString(...)`
- `fmtTime(d, opts?)` instead of `d.toLocaleTimeString(...)`
- `fmtDateTime(d, opts?)` instead of `d.toLocaleString(...)` for Dates
- `fmtNumber(n, opts?)` instead of `n.toLocaleString(...)` for numbers
- `formatDate(d, fmt)` — re-export of date-fns `format` with `{ locale }` injected
- `formatDistance`, `formatDistanceToNow`, `formatRelative` — same pattern

The ESLint rule `i18n/no-raw-locale-call` is **ERROR** level and blocks any
new call site that omits/hardcodes the locale. To bypass for a specific
line (e.g. a fixed timestamp shown to the user *in their own data*), use:
`// i18n-allow-next-line: <reason>`.

### Catalog quality — register matters

DE is the source of truth. Brand voice is **du-form** (informal) throughout.
Never write `Sie/Ihr/Ihnen` — even when translators emit it, the LLM audit
will flag it. After bulk translation, always run the audit workflow:
`gh workflow run i18n-audit-llm.yml -f locale=<code> -f provider=gemini`.
Apply the auto-confidence suggestions via:
`node scripts/apply-audit-suggestions.mjs --locale=<code>` (≥0.80 by default).

### AI-generated content — must respect user locale

**This is the rule that catches new features shipping in English.** Every
edge function or gateway service that calls an LLM on behalf of a user
MUST inject the user's preferred language into the system prompt. The LLM
defaults to English without it.

**For Supabase edge functions** (`supabase/functions/*/index.ts`):

```ts
import { getUserLocale, buildLocalizedSystemPrompt } from '../_shared/llm-locale.ts';

const userLocale = await getUserLocale(supabase, user.id);
const systemPrompt = buildLocalizedSystemPrompt(
  `You are an expert health coach...`,
  userLocale,
);
// then pass systemPrompt to the LLM call as usual
```

The helper does three things:
1. Reads `profiles.preferred_language` / `profiles.stt_language` (fallback `'de'`)
2. Prepends a `LANGUAGE: Respond ONLY in {Deutsch}` directive
3. Adds register hint (du-form for DE, ti-form for SR, tú-form for ES)
   and compound-word rule (German hyphens at 22+ chars)

**For gateway TypeScript services** (`services/gateway/src/**`): the
mirror helper lives in `services/gateway/src/i18n/llm-locale.ts`
(builds on the existing `getUserLocale` from `i18n/server-locale.ts`).

**When you skip this**: explicit comment why. E.g. `// admin-facing,
English by design` for admin/dev tooling. New code without either the
wrapper OR the explicit skip-comment should be rejected in PR review.
