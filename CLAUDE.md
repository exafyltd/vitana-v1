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

## Deployment — production is AWS. GCP is fully decommissioned, not a rollback target.

**`vitanaland.com` and `www` are served by the AWS ECS service
`vitana-community-app-awsdr`.** This moved at the VTID-03419 cutover
(2026-07-27) and became the *only* option 2026-08-16, when GCP project
`lovable-vitana-vers1` had billing disabled and its `gateway` Cloud Run
service was deleted outright (VTID-03599/VTID-03649, see
`exafyltd/vitana-platform` CLAUDE.md §1). **Cloud Run's `community-app` is
no longer a usable rollback target — GCP billing is off, so nothing
deployed there can serve traffic even if the service object still exists.**
There is no cloud to roll back to but AWS.

| Host | Serves | Role |
|------|--------|------|
| **AWS ECS** `vitana-community-app-awsdr` | `vitanaland.com`, `www`, `dr-app.vitanaland.com` | **Production — the only place that serves traffic** |
| ~~Cloud Run `community-app`~~ | ~~its own `*.run.app` URL~~ | **Dead — GCP billing is off. Do not treat as a rollback target.** |
| Lovable CDN | `vitana-lovable-vers1.lovable.app` | Legacy, being decommissioned |

`DEPLOY.yml`'s `aws_prod` job (calling `AWS-PROD-DEPLOY-FRONTEND.yml`) is
now the only leg that matters. If it still has a GCP/Cloud Run deploy job
alongside it, that job is dead weight — it will fail against
disabled billing, not silently succeed, so at least it won't be mistaken
for a working rollback. **If you edit `DEPLOY.yml`, keep `aws_prod`** and
treat removing the dead GCP job as a safe, low-priority cleanup.

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
job): frontend changes auto-deploy to **staging** (ECS
`vitana-community-app-staging` via `AWS-STAGE-DEPLOY-FRONTEND.yml`, on
**`preview-aws.vitanaland.com`**), and production is reached only via:

1. the single **PUBLISH** button in the backend Command Hub, or
2. a deliberate manual `workflow_dispatch` of `DEPLOY.yml` (requires a `reason`)
   — the documented exception.

**If a production deploy is approved WITHIN a Claude Code session** (the
user approves shipping to prod in conversation, carried out via path 2
above rather than PUBLISH) → that approval scopes to this session's own
change only, never to whatever else is currently sitting on `main`/staging.
PUBLISH is a deliberate, human-operated decision to promote the *entire*
tested staging build; an in-session approval is not that — it's consent
for the specific fix this session produced. `DEPLOY.yml`'s manual dispatch
takes a `commit_sha` input that defaults to `github.sha` (i.e. whatever
`main` HEAD is at dispatch time) — **always pass this session's own merge
commit SHA explicitly** rather than accepting that default, so the deploy
can't silently carry along other work that landed on `main` ahead of it
and that this conversation never reviewed or approved. If this session's
commit can't be cleanly isolated (something else merged in between and the
workflow builds from a ref rather than a pinned diff), stop and tell the
user what else would ship alongside theirs before proceeding.

`supabase-functions-deploy.yml` is gated the same way (no staging-functions
auto-deploy yet, so it is freeze-only on the auto path post-cutover; ship via
manual dispatch). `STAGE-DEPLOY-FRONTEND.yml` is **not** gated — staging deploys
always run. The backend half of the cutover lives in `exafyltd/vitana-platform`.

### GCP billing is OFF — where staging and previews live now (VTID-03658)

GCP billing on `lovable-vitana-vers1` was **deliberately disabled**. Anything
that deploys Cloud Run or pushes to Artifact Registry now fails with
`BILLING_DISABLED`, and **`preview.vitanaland.com` returns 500**. It is not
coming back; do not send anyone there and do not "fix" a red Cloud Run deploy.

**Staging did not have to move — it was already on AWS in parallel.**
`AWS-STAGE-DEPLOY-FRONTEND.yml` has been auto-deploying every push to `main`
onto ECS `vitana-community-app-staging` the whole time. That is now the only
staging frontend:

| Surface | URL |
|---|---|
| **Staging frontend** | **`https://preview-aws.vitanaland.com`** |
| Staging gateway | `https://preview-aws-gateway.vitanaland.com` |
| ~~Cloud Run staging~~ | ~~`preview.vitanaland.com`~~ — dead, 500 |

`STAGE-DEPLOY-FRONTEND.yml` is **retired**: its push trigger is removed and
only `workflow_dispatch` remains, so it can be revived unchanged if billing
ever returns. The file is kept rather than deleted because
`preview.vitanaland.com` still appears in older docs, bookmarks and PR
comments, and whoever lands on it needs to find out where staging went.

### Per-PR preview deploys — S3 + CloudFront

Every open PR touching frontend files gets its own prefix on a shared bucket,
served over CloudFront at `/<pr-number>/`:

- `PREVIEW-DEPLOY-FRONTEND.yml` builds with `--base=/pr-<n>/`, syncs to
  `s3://vitana-pr-previews/pr-<n>/`, invalidates, verifies the CDN actually
  serves that commit's assets, and posts/updates a PR comment.
- `PREVIEW-TEARDOWN-FRONTEND.yml` removes the prefix when the PR closes. A
  30-day bucket lifecycle rule is the backstop for teardowns that never ran.
- One-time provisioning: **`scripts/aws/setup-pr-previews.sh`** (bucket,
  SPA-fallback CloudFront function, scoped IAM). Needs the
  `PREVIEW_CF_DISTRIBUTION_ID` / `PREVIEW_CF_DOMAIN` repo secrets it prints;
  without them the deploy workflow fails fast with a named reason instead of
  half-deploying.

**Why not a per-PR ECS service:** it would need a task definition, service,
target group AND an ALB listener rule per PR — and listener-rule *priority*
has already caused one silent misroute here (§1b in the platform repo: the
path rules at priority 10 match before higher-numbered host rules regardless
of `Host`). Churning those per pull request invites that failure on a
schedule. S3 prefixes have no ordering to get wrong. The app is a static SPA;
the container was never doing anything a CDN does not.

**Still do not point a feature branch at the shared staging service.** Two
branches doing that back-to-back overwrite each other's verification — that
happened and reverted a merged fix on staging. Use the PR's own preview URL.

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
- `VITE_GATEWAY_URL` — Backend API (`gateway.vitanaland.com`, AWS ECS since
  VTID-03419; the old `gateway-*.run.app` Cloud Run form is dead — GCP is
  decommissioned, see the Deployment section above)
- `VITE_OPERATOR_BASE_URL` — Operator API
- `VITE_DEV_HUB_ENABLED` — Dev Hub feature flag

### ✅ RESOLVED 2026-08-20 — frontend TTS now goes through the gateway (Polly)

This section previously flagged a live outage: `useTextToSpeech.ts` and
`VoiceSettingsPanel.tsx` called two Google TTS Supabase edge functions
directly, never went through the gateway's Polly migration, and had nothing
to reach once GCP billing went off.

**Fixed.** Both now call `src/lib/gateway-tts.ts` →
`POST {VITE_GATEWAY_URL}/orb/tts`, the gateway's Polly-first route
(`optionalAuth`, so anonymous callers work too).

Three things to know before touching this:

1. **The client no longer names a voice.** The gateway resolves it from the
   LANGUAGE. `tts_voice` is now only the BROWSER-fallback voice — it is not
   read for cloud speech at all. A provider-specific id on the client is what
   turns the next provider switch into a per-user data migration (platform
   CLAUDE.md §2c); VTID-03671 stopped writing them and this stops reading them.
2. **The frontend does NOT know which languages Polly can speak, on purpose.**
   It asks the gateway and treats a failure as "not servable → browser
   speech." A second copy of that table here would drift from
   `POLLY_UNSUPPORTED_LANGS` exactly the way five copies of a language-name
   map drifted in VTID-03644. Cost: one wasted round trip per unservable
   language per page load, capped by an in-module cache.
3. **Serbian still has no cloud voice** and now falls back to browser speech
   rather than erroring. Polly has no Serbian voice in any engine — confirmed
   against the live API 2026-08-20 (106 voices, 42 language codes, no
   `sr`/`hr`/`bs`/`sh`). That is a product gap needing a third provider, not
   a bug in this path.

A tree-wide guard in `src/lib/gateway-tts.test.ts` fails the build if any
non-test source file references those Google edge functions again.

## Multi-Repo Context

This is the **frontend** repo. The backend is in `exafyltd/vitana-platform`:
- **Backend API + Command Hub:** `vitana-platform/services/gateway/`
- **This app calls:** `VITE_GATEWAY_URL` for all API requests
- **Both repos** should be available in every Claude Code session

## Testing

**Test user UUID:** `a27552a3-0257-4305-8ed0-351a80fd3701`
Use this user when an authenticated user is needed for testing (e.g., Playwright screenshots, API calls, profile checks).

### Why no host is exempt from the absolute rule above (VTID-03506)

The ban at the top of this file covers **every write** as this account — a
profile edit, an onboarding step, a settings toggle, a wallet call, not only
community content. This section exists for the follow-up question it kept
provoking: *"then I'll just run it against the preview instead."*

**You cannot. There is no safe host for a write today, and picking a "safer" URL
does not create one.** `PREVIEW-DEPLOY-FRONTEND.yml` (L69–81) and
`STAGE-DEPLOY-FRONTEND.yml` (L72–93) override **only** the gateway URL and
deliberately leave Supabase unset, so both builds inherit the **production**
Supabase project from the committed `.env` — gateway-staging runs against prod
Supabase too (BOOTSTRAP-ORB-STAGING-SUPABASE-ALIGN; `docs/STAGING.md` §6/§9b),
and the frontend must match it or authed features silently degrade. A post
created on `community-app-pr-123` lands in the same `profile_posts` rows real
members read. **The host selects which _code_ runs; it does not select which
database gets written.**

So a PR preview is not an isolated environment — it is production with different
frontend code in front of it. Every write lands in the same rows real members
read, whichever URL you were pointed at. **Reading is fine everywhere; writing is
fine nowhere**, and community content — posts, comments, likes, videos, chat
messages — is the case with no exception clause at all, because it reaches real
feeds and lock screens the instant it lands.

Verify feed and interaction changes against content that already exists, a Vitest
unit/integration test, or a local Supabase. If a change genuinely cannot be
verified without new community content, **that is a blocker to raise, not a rule
to route around** — it needs an isolated Supabase project for testing, which does
not exist yet.

On 2026-08-05 a session reproducing VTID-03503 created 5 public posts as this
account on production between 14:54 and 15:00 UTC. Using a PR preview would have
produced the identical rows and the identical pushes — the environment was never
the protection anyone assumed it was. `trg_notify_community_post`
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

### Active locales & RTL

Shipped locale shards live under `src/i18n/<code>/`: **de** (source of
truth), **en**, **es**, **sr**, and **ar** (Arabic). Arabic is
**right-to-left** — any new layout/component must work in RTL, not just
LTR. Don't hardcode `left`/`right`; prefer logical properties
(`ms-*`/`me-*`, `start`/`end`, `text-start`) and rely on `dir`-aware
styling. Verify new screens in both directions before reporting done.

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
