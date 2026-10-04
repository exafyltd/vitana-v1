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

## Deployment

**Moved to `.claude/rules/infrastructure.md`** — loaded automatically
when a session touches `.github/workflows/**`. Covers AWS production
hosts, the staging-first cutover mechanics, GCP-billing-off staging
relocation, and per-PR S3+CloudFront previews. Pure relocation, nothing
rewritten or summarized.

The two deployment **gates** below stay here, unscoped, instead of in
that file — they must apply regardless of which files a session happens
to open, the same reasoning the platform repo's CLAUDE.md already applies
to VTID/Governance. A session doing ordinary `src/**` work, or dispatching
a production deploy without first opening a workflow file, still has to
see them.

### Staging Verification Gate — STANDING RULE (VTID-04610)

Owner decision 2026-09-26. The full process lives in one place:
**`exafyltd/vitana-platform` → `docs/DEPLOYMENT-PIPELINE.md`** (platform
CLAUDE.md Part 1 rules 46–50). For this repo:

1. **Merge → staging deploy → STAGING-VERIFY.** Every frontend merge that
   deploys (`AWS-STAGE-DEPLOY-FRONTEND.yml` → `preview-aws.vitanaland.com`) is
   followed automatically by a test run against that staging build: the
   community-app smoke suite plus this change's own
   `docs/validation/<VTID>/staging-tests.json`. Done means that run passed on
   the exact deployed chunk, not "the deploy workflow is green".
2. **No suite, no merge.** If the change has no test that proves it on
   staging, write it (usually a Playwright spec) in the same PR.
3. **Read-only.** Staging frontends use the production Supabase project (see
   "Why no host is exempt" below). Staging specs sign in, navigate and read;
   a network guard aborts every non-`GET` to the gateway and Supabase REST
   except sign-in. Anything that needs a write is covered by Vitest. No suite
   ever points at `vitanaland.com`.
4. **Ready message — Claude Code session + Command Hub Operator Chat only:**
   *"Staging verified — ready for deployment to production?"*, with the
   verified commit, results and every commit between production and it.
5. **"Yes" → PUBLISH directly** — the Command Hub promotion, or from Claude
   Code the prod workflow pinned to the verified commit (`commit_sha`). The
   commit list in the ready message is what the "yes" approves; the
   in-session scoping rules below apply to anything outside it. Verification
   failed → no prompt, fix forward.

After PUBLISH, production gets the deploy check in "Verifying a frontend
deploy actually shipped" (`.claude/rules/infrastructure.md`) and nothing
more — no test suite runs against production.

### Plan Sparring Gate — STANDING RULE (VTID-04868)

Owner decision 2026-10-03. The full rule lives in **`exafyltd/vitana-platform`
→ `CLAUDE.md` Part 1 rules 51–55**; procedure: skill `plan-sparring`
(`.claude/skills/plan-sparring/`). For this repo:

1. **Plan → sparring → owner approval → VTID → code.** Every new plan is
   sparred by the independent `plan-sparring-partner` agent (read-only,
   Claude Opus 4.6) before its VTID is allocated. No VTID for the sparring
   itself.
2. Every finding gets an answer (accepted / rejected / deferred) and goes back
   to the same partner; at least two passes; anything still disputed goes to
   the owner.
3. The PR carries the record as `docs/validation/<VTID>/plan-sparring.md`.
4. A PreToolUse hook denies an allocation call that references no sparring
   record (`p_sparring_id`, or a `-- sparring_record: <path>` comment); the real
   gate is the `vtid_ledger` trigger in the platform database.

### Scoping a production deploy to what was actually approved

**If a production deploy is approved WITHIN a Claude Code session** (the
user approves shipping to prod in conversation, carried out via a manual
`workflow_dispatch` rather than PUBLISH) → that approval scopes to this
session's own change only, never to whatever else is currently sitting on
`main`/staging. PUBLISH is a deliberate, human-operated decision to promote
the *entire* tested staging build; an in-session approval is not that —
it's consent for the specific fix this session produced. `DEPLOY.yml`'s
manual dispatch takes a `commit_sha` input that defaults to `github.sha`
(i.e. whatever `main` HEAD is at dispatch time) — **always pass this
session's own merge commit SHA explicitly** rather than accepting that
default, so the deploy can't silently carry along other work that lands on
`main` AFTER it.

**Pinning a commit SHA is necessary but not sufficient.** `commit_sha` is
checked out as a full repository snapshot (`ref: ${{ inputs.commit_sha ...
}}`), not applied as a diff — so a pinned commit still ships every commit
that is already an ANCESTOR of it, including anything merged to `main`
before this session's own PR that this conversation never reviewed or
approved. Before dispatching: diff the pinned commit against the revision
currently live in production (its build-info/health endpoint reports the
deployed commit) and confirm every commit in that range is either this
session's own work or something the user has separately approved for this
deploy. If that range contains changes this conversation didn't produce or
the user hasn't approved, and they can't be excluded (the deploy ships a
full snapshot, never a pinned diff), stop and tell the user exactly what
else would ship alongside theirs before proceeding.

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

**Moved to `.claude/rules/frontend.md`** — loaded automatically when a
session touches `.env`/`.env.example`/the TTS files it discusses
(`gateway-tts.ts`, `useTextToSpeech.ts`, `VoiceSettingsPanel.tsx`).
Covers the `VITE_*` build-time env vars and the frontend-TTS-through-
the-gateway (Polly) resolution note. Pure relocation, nothing rewritten
or summarized.

## Multi-Repo Context

This is the **frontend** repo. The backend is in `exafyltd/vitana-platform`:
- **Backend API + Command Hub:** `vitana-platform/services/gateway/`
- **This app calls:** `VITE_GATEWAY_URL` for all API requests
- **Both repos** should be available in every Claude Code session

## Testing

**Test user UUID:** `a27552a3-0257-4305-8ed0-351a80fd3701`
Use this user when an authenticated user is needed for testing (e.g., Playwright screenshots, API calls, profile checks).

Automated staging verification (the Staging Verification Gate above) is
read-only by construction, and that is exactly why it can run as this user on
staging without breaking the absolute rule. The rule itself does not change.

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

## What's New cards — automatic (VTID-04733)

**Any user-facing addition or redesign adds one file to `src/whats-new/entries/`**
(`<id>.json`: EN + DE du-form copy, path deep link — see
`src/whats-new/README.md`). Same PR, no exceptions for features a member will
notice; skip for fixes/refactors/admin-only work. Once the build is live in
production, the gateway turns the entry into a "Brand New Feature" News Feed
card + push, once, automatically. Do not publish these cards by hand any more.
**If you forget, it is drafted for you (VTID-04739):** after merge,
`WHATS-NEW-DRAFT.yml` has a Bedrock Claude model judge the PR and open a
`What's New: …` PR with a drafted EN/DE entry for a human to approve — needs a
VTID in your PR title. Adding the entry yourself is still preferred (you know
the wording best) and a PR that adds one is never drafted for.

## Voice navigation — the screen registry (VTID-04502)

`src/navigation/registry/` is the single list of screens Vitana can take a
member to (owner decision 2026-09-24; the Command Hub navigator only adds
tenant overrides on top). **Adding a page in `App.tsx` means adding it to
`screens.json` with its English and German phrasings and every locale title
— or to `exclusions.json` with a reason.** `npm test` fails until you do.
Routes must point at the page a member lands on, never at a `<Navigate>`
redirect. The build publishes the merged registry as `/nav-registry.json`
for the gateway. Details: `src/navigation/registry/README.md`.

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
