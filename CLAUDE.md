# Vitana V1 — Community App

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

## Deployment — production is AWS, not Cloud Run

**`vitanaland.com` and `www` are served by the AWS ECS service
`vitana-community-app-awsdr`.** Cloud Run's `community-app` is a rollback
target that no user reaches. This moved at the VTID-03419 cutover.

| Host | Serves | Role |
|------|--------|------|
| **AWS ECS** `vitana-community-app-awsdr` | `vitanaland.com`, `www`, `dr-app.vitanaland.com` | **Production — what users get** |
| Cloud Run `community-app` | its own `*.run.app` URL | Rollback target, kept in sync |
| Lovable CDN | `vitana-lovable-vers1.lovable.app` | Legacy, being decommissioned |

`DEPLOY.yml` deploys **both** — its `aws_prod` job calls
`AWS-PROD-DEPLOY-FRONTEND.yml` with the same pinned commit (VTID-03483).
Before that job existed, running `DEPLOY.yml` deployed Cloud Run, reported
success everywhere, and left every visitor on the previous build; shipping
anything required a second, separate, undocumented dispatch of the AWS
workflow. **If you edit `DEPLOY.yml`, keep `aws_prod`.**

### Verifying a frontend deploy actually shipped

A green workflow is not evidence. Check the bytes production serves, and
sample repeatedly — an ECS rolling deploy serves the old and new build
side by side for a minute or two, so a single request can report either:

```bash
for i in $(seq 1 20); do
  curl -s "https://vitanaland.com/<page>?s=$i" \
    | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1
done | sort | uniq -c
```

Only when all samples agree on the new chunk is the deploy live. Then grep
that chunk for a string unique to your change. Cloudflare fronts the apex
but sends `cf-cache-status: DYNAMIC` with `no-store` for the SPA shell, so
a stale response means the rollout is still in flight, not a cache.

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

### Never write as the test user against production (VTID-03506)

Sign the test account in **only** against a PR preview (`community-app-pr-<number>`)
or staging (`preview.vitanaland.com`). **Never** against `vitanaland.com`,
`www`, or `dr-app.vitanaland.com`. Reading prod as the test user is fine;
**writing** to it is not, and "just one post to check the feed" is exactly the
write that caused this rule.

On 2026-08-05 a session reproducing VTID-03503 created 5 public posts as this
account on production between 14:54 and 15:00 UTC. `trg_notify_community_post`
fans out to every member of the author's tenant, so those 5 inserts became **960
notifications and 600 delivered pushes** — real members' lock screens filled with
"E2E Test User shared a new post". Deleting the posts afterwards fixed nothing:
a push is unrecallable the moment it is sent.

The account is a full member of the production tenant, which is what makes a
"harmless" test write indistinguishable from a real member posting. Two guards
now exist (migration `20260805160000`): `_notif_is_test_actor()` plus a BEFORE
INSERT sink guard on `user_notifications` that drops any notification whose
actor is a registered or `e2e-%`/`@vitanatest.exafy.io` account. **Treat them as
the seatbelt, not the permission slip** — they stop notifications, not the posts,
comments, likes, or chat messages themselves, which still land in the real feed
in front of real people. Register any new test account in
`notification_test_actors`.

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

---

## Mandatory Codebase Intelligence Workflow

Before planning, modifying, debugging, reviewing, or generating code, always query both RepoWise and Graphify. Do not begin implementation from assumptions or broad grep searches.

### 1. Verify index freshness

1. Determine the current repository and Git `HEAD`.
2. Select the correct RepoWise MCP server. Never use an index belonging to another repository or an older checkout.
3. Confirm RepoWise's indexed commit matches `HEAD`.
4. Check for `graphify-out/graph.json`.
5. If either index is missing or stale, update it before implementation:
   - `repowise update`
   - `graphify --update`

Report any indexing failure clearly. Do not silently continue with stale information.

### 2. Read the codebase before execution

Use RepoWise for precise code and health information:

1. Call `get_overview` once to understand architecture, layers, entry points, and key modules.
2. Use `search_codebase` to locate relevant concepts, symbols, and paths.
3. Use `get_context` for compact file and module context.
4. Use `get_symbol` only when full implementation bodies are required.
5. Use `get_why` when architectural decisions or historical rationale matter.
6. Call `get_risk` before changing shared, central, or high-risk files.

Use Graphify for relationships and system-wide reasoning:

1. Run `graphify query "<task-specific question>" --budget 1500`.
2. Use `graphify path "<source>" "<target>"` to trace dependencies or data flow.
3. Use `graphify explain "<component>"` for unfamiliar systems.
4. Pay particular attention to god nodes, community boundaries, dependency paths, and surprising cross-module connections.

### 3. Produce a pre-execution code map

Before editing, establish:

- Relevant entry points and execution flow.
- Files, symbols, modules, and tests involved.
- Upstream and downstream dependencies.
- Existing patterns that should be followed.
- Architectural constraints and recorded decisions.
- Health hotspots, complexity, missing tests, and change risk.
- The smallest safe implementation scope.

Do not start execution until this map is sufficient to explain what will change, why, and what may be affected.

### 4. Minimize token and search waste

- Treat RepoWise and Graphify as the primary navigation layer.
- Do not recursively read directories or perform broad grep searches when an indexed query can answer the question.
- Retrieve compact context first and expand only the exact files or symbols required.
- Do not repeatedly call `get_overview` during the same task unless the index changes.
- Reuse already retrieved results instead of requesting identical context again.
- Raw file reads are allowed only for targeted implementation details, verification, or when an index result is missing, stale, ambiguous, or approximate.
- Source code and tests remain the final authority; never invent a relationship that the indexes or source do not support.

### 5. Validate after implementation

After changing code:

1. Run the relevant tests, linting, type checks, and build.
2. Re-query change risk for the affected files when appropriate.
3. Update both indexes:
   - `repowise update`
   - `graphify --update`
4. Confirm the indexes now match the final Git state.
5. Summarize changed behavior, affected dependencies, risks, and verification evidence.

A task is not complete until the implementation is verified and both indexes are current.

For Graphify's built-in Claude integration, also run once per repository:

```
graphify claude install
```

This workflow improves Claude's navigation speed, token efficiency, and change accuracy. It does not automatically improve application runtime performance—that requires acting on the health and performance findings uncovered by the indexes.
