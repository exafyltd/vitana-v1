# VTID-05157 — Plan sparring record (Native app Wave 0: Expo skeleton, Linux CI, parity ledger, extraction analysis)

- **VTID:** VTID-05157
- **Program:** VTID-05021 (Native app), Wave 0 — `docs/programs/native-app/NATIVE-APP-PLAN.md` §5
- **Sparring session:** `8aca0f9c-5997-469f-afc0-17b24c100e6d`
- **Partner:** `plan-sparring-partner` agent (independent, read-only)
- **Change class:** standard
- **Rounds:** 2 — verdict **CONVERGED**
- **Plan hash (round 1):** `8bd8a48e52cd52f5d509a0dbc49f7d12175948ef925a1adbc3960d7fcc35a3b2`
- **Plan hash (final):** `e06d0867675390a25f17984f366c88eb6666e45121b8168d3672a0b523ff4430` — sha256 of the text strictly between the plan:begin and plan:end markers below
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-13 — "Continue and make the decisions yourself" (Gate 1; planner defaults taken for open questions 1–5)

## Rounds

| Round | Finding | Severity | Planner answer |
|---|---|---|---|
| R1 | F6 | major | accepted (plan changed) |
| R1 | F7 | major | accepted (plan changed) |
| R1 | F1 | minor | accepted (plan changed) |
| R1 | F2 | minor | accepted (plan changed) |
| R1 | F3 | minor | accepted (plan changed) |
| R1 | F5 | minor | accepted (plan changed) |
| R1 | F8 | minor | accepted (plan changed) |
| R1 | F4 | — | no change needed |
| R1 | F9 | — | no change needed |
| R2 | — | — | all round-1 findings closed; verdict CONVERGED |
| R2 | F10 | minor | accepted: `no-restricted-globals` also bans `sessionStorage` and `matchMedia`; `navigator` stays allowed (React Native ships a partial one) |

Nothing disputed, nothing escalated. The partner's findings are kept verbatim in the sparring session above.

## Owner decisions (Gate 1 open questions — planner defaults)

1. Repo layout: `apps/mobile/` in vitana-v1 (program §3), self-contained in Wave 0, workspaces deferred to Wave 1.
2. NATIVE-CI is not made a required status check yet.
3. No Android debug build on Linux in Wave 0 (first item of STATUS row 8b).
4. Ledger scope: `/commerce/connect/*` in scope (business mode); `/tickets/demo` `out:excluded`; `/download` and
   `/maxina/app` in scope with status `exception` (the native app replaces them).
5. Expo SDK: the latest stable SDK at least two weeks old; minimum OS versions are what that SDK supports (recorded in
   `apps/mobile/README.md` and the PR).

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, one VTID (allocated after sparring and Gate 1; sparring record
  `docs/validation/<VTID>/plan-sparring.md`, `scope.json` pointing at it). One vitana-v1 PR plus a docs-only
  vitana-platform PR that updates `docs/programs/health-hub/STATUS.md` rows 8/8b.
- **Program:** Native app VTID-05021, Wave 0 (program §5), "Expo project + CI; extraction dependency analysis; parity
  ledger script". It is step (1) of the phased extraction in program §3: the analysis only, with nothing moved and no
  `packages/` created.
- **Repo / areas (vitana-v1):**
  - new: `apps/mobile/**`, `scripts/native/**`, `.github/workflows/NATIVE-CI.yml`,
    `docs/programs/native-app/EXTRACTION-ANALYSIS.md`
  - edited: `eslint.config.js` (ignores + one `apps/mobile/**` override block), `eslint-rules/no-raw-jsx-text.js` (two attribute names), `.dockerignore`
    (one line), `CLAUDE.md` (one short paragraph)
  - **Not touched:** `src/**`, `public/**`, root `package.json` / `package-lock.json`, `vite.config.ts`, `Dockerfile`, or any
    other path that triggers a deploy.
- **Production safety:** the skeleton makes **no network calls**. Its config module refuses production hosts, and no
  production profile exists in Wave 0. CI has no secrets and no Expo/EAS account token, and makes no store or Firebase calls.
- **Gates:**
  - G1 (test environment, STATUS row 5): needed by nothing here.
  - G2 (Firebase, row 6) and G3 (store/signing, row 7): needed by nothing here. Both are listed under Out of scope.

## Facts (file:line, origin/main)
**Program and status**
- F1 Program §3 fixes the layout: the app at `apps/mobile/` in vitana-v1, and the extracted code at `packages/core/` +
  `packages/tokens/` (`NATIVE-APP-PLAN.md:10-13, 123-126`). Extraction is phased. Step (1) is the dependency analysis.
  Step (2) is a re-export layer through TS path aliases. Step (3) moves modules one per PR. All of it is Wave 1
  (`:127-131`). Expo Router route paths are identical to web paths (`:136-138`).
- F2 Wave 0 row: "Expo project + CI (EAS or GitHub macOS runners); extraction dependency analysis; parity ledger script
  + screenshot tooling" (`:195`). Program §4 parity ledger: every in-scope route from `screens.json` plus the role/public
  routes gets a row (web path, native status, owner, last parity check). CI fails when `screens.json` gains a member
  route without a native entry or a recorded exception (`:174-176`).
- F3 Scope of native parity (`:81-83`):
  - in scope: community member screens and overlays; public/auth/legal; patient, professional, staff and business modes
  - admin: opened in the system browser (`:95-96`)
  - backoffice/dev: stay excluded
- F4 STATUS (vitana-platform `docs/programs/health-hub/STATUS.md`) rows 6–8 are G2 (owner: Firebase ownership), G3 (owner:
  store access) and Wave 0 "queued — blocked on macOS build minutes".

**Repository shape**
- F5 There is no `apps/` or `packages/` today. The root `package.json` has no `workspaces` and pins `npm@10.9.7` (`:6`).
  It uses React `^18.3.1` (`:118`), `@supabase/supabase-js` (`:98`), `@tanstack/react-query` (`:100`), `zod` (`:132`),
  `zustand` (`:133`), `typescript` (`:159`) and `vitest` (`:162`).
  - External fact, not in the repo: current Expo SDKs ship React 19. A single hoisted workspace would therefore mix
    React 18 (web) and React 19 (native).
- F6 Deploy paths. `AWS-STAGE-DEPLOY-FRONTEND.yml:36-43+` triggers on `src/**`, `public/**`, `index.html`, `Dockerfile`,
  `nginx.conf`, `package.json`, `package-lock.json`, `bun.lock`, `vite.config.ts`. The canonical list is
  vitana-platform `scripts/ci/staging-verify/lib.cjs:44-58`. `STAGING-TESTS-REQUIRED.yml:77` exits "nothing deploys, no
  staging suite needed" when none is touched.
  - Consequence: a root workspace edit, or any file under `src/`, would trigger a staging deploy and require a suite.
  - That includes a Vitest test under `src/`, an i18n key, and the registry README.
- F7 `Dockerfile:13-17` runs `npm ci` on the root lock, then `COPY . .`, then `npm run build`. `.dockerignore` has 15
  lines:
  - excluded: `node_modules`, `.git`, `docs`, `reports`, `stories`, `.lovable`, `.claude`, `*.md`, `.kiro`
  - `scripts`, with the exceptions `!scripts/nav` and `!scripts/whats-new`
  - also `!README.md`

  None of these lines covers `apps/`, so `apps/mobile/` would enter the build context. The `node_modules` line matches
  only the top-level folder, so a local `apps/mobile/node_modules` would enter it too.
- F8 Tooling scope:
  - Root Vitest includes only `src/**/*.test.{ts,tsx}` (`vitest.config.ts:19`).
  - The PR-GATE typecheck ratchet runs `tsc -p tsconfig.app.json` (`PR-GATE.yml:116-121`), whose `include` is `src`.
  - The ESLint ratchet runs `eslint .` (`PR-GATE.yml:123-129`). Root `eslint.config.js:20-26` ignores `dist`,
    `node_modules`, `scripts/**` and applies the i18n rules to `**/*.{ts,tsx}`, so `apps/mobile/**` is linted by the
    same i18n rules automatically.
- F9 `eslint-rules/no-raw-jsx-text.js:38-39`: the translatable attributes are `placeholder, title, aria-label,
  aria-description, alt`. React Native's `accessibilityLabel` / `accessibilityHint` are not covered, and `src/` has 0 uses
  of either (git grep). No rule tests exist under `eslint-rules/`.
- F10 Existing CI: `UNIT-TESTS.yml` uses `ubuntu-latest`, Node 20 and `npm ci`. No workflow references Expo, EAS,
  Maestro or macOS.

**Inputs for the parity ledger**
- F11 `scripts/nav/spa-routes.mjs:65` `extractSpaRoutes(source)` walks `App.tsx` with the TS compiler API. It returns
  `{path, redirectTo?, index?, requiredRole?}` with nested paths joined (`:10`, `:51-59`, `:78-83`). Run read-only on
  origin/main: 429 routes, 82 redirects, **345 page routes**.
  - requiredRole: admin 94, backoffice 27, staff 8, professional 8, patient 7, community 11, none 190.
  - The program's "≈433 / ≈346" hand count is superseded by this script output.
- F12 `src/navigation/registry/screens.json` is `{version, screens[]}` with **184** screens; the program said 185.
  - access: member 179, public 5
  - field counts: `mobileRoute` 18, `overlay` 8, `viewport` 2 (`INBOX.ARCHIVED` desktop, `MEMORY.DAILY_DIARY` mobile),
    `params` 11, `disabled` 4
  - `index.ts:86` exports `SCREENS`; `:31-33` lists the 11 registry locales.
- F13 `src/navigation/registry/exclusions.json` has 9 prefixes (`/admin /backoffice /staff /professional /patient
  /commerce /partner /dev /exafy-admin`) and 43 paths. Most of the paths are mobile-relevant deep links and auth/public
  pages, for example `/oauth/complete`, `/reset-password`, `/i/:code`, `/e/:slug`, `/inbox/u/:recipientId/msg/:messageId`
  and `/calendar/entry/:entryId`.
  - `registry.routes.test.ts:69-78` already guarantees: every non-redirect App.tsx page is registered, or excluded by
    path or prefix.
- F14 Business mode is `/commerce*` (`src/lib/business-mode.ts:37-48`, excluding `/commerce/join` and
  `/commerce/invites`). `/partner/connections*` is `requiredRole="admin"`, which places it on the admin side.

**Extraction candidates (program §3 list) and their visible coupling**
- F15 `src/integrations/supabase/client.ts`:
  - `:10-16` falls back to the **production** Supabase URL and anon key when the env var is unset
  - `:27` uses `storage: localStorage`
  - `:11, :15, :20` use `import.meta.env`

  So it cannot be imported by native as it stands. G1 requires native dev builds never to reach production
  (program `:112-116`).
- F16 `src/lib/gateway-base.ts`:
  - `:11` defaults to `https://gateway.vitanaland.com` (production)
  - `:27` evaluates `import.meta.env` at module load
  - `resolveGatewayBase` (`:19-25`) is pure
- F17 `src/i18n/index.ts`:
  - `:26`, `:40-49` use `import.meta.glob`, which is Vite-only (Metro has no equivalent)
  - `:52-55` excludes `_audit.json` files
  - Each of the 11 locales has 114 shard files under `src/i18n/<code>/` (JSON, pure data)

  `src/lib/i18n-toast.ts:15-17` imports `sonner` (web toast) and `catalogs`.
- F18 `src/lib/business-mode.ts:17` imports `lucide-react` icons and `:97-106` uses `window.localStorage`.
  `src/config/drawer-nav.config.ts:1-23` imports `lucide-react` icons. In both files the data is mixed with web-only icons.
- F19 `src/lib/locale-format.ts:16` depends on `i18n-toast`. `src/hooks/use-mobile.tsx:3-12` uses `window` /
  `matchMedia`. `src/lib/` has 280 files and repowise reports 5 import cycles in the repo.
- F20 i18n locales: `src/contexts/LanguageContext.tsx:29-78` lists 11 GA locales, and `ar` is RTL (CLAUDE.md "Active
  locales & RTL"). The editorial font is Cormorant, loaded from Google Fonts (`index.html:39`,
  `tailwind.config.ts:52`).

## Changes (numbered)
**A. Layout decision**
1. **Folder in vitana-v1, as program §3 says (F1). Not a new repository.** In Wave 0, `apps/mobile/` is a
   **self-contained npm project** with its own `package.json` and `package-lock.json`, installed with
   `npm ci --prefix apps/mobile`. It is **not** a root workspace. Reasons:
   - (a) A root `package.json` / lock edit is a deploy path (F6): it would trigger a staging deploy and require a staging
     suite for a change that alters no web byte.
   - (b) React 18 web vs React 19 native (F5) would conflict under hoisting.
   - (c) `Dockerfile:14` would install React Native dependencies into the web image build (F7).

   `packages/core` and `packages/tokens`, and whether to switch to npm workspaces, are decided in the Wave 1 extraction
   plan using change 8's report. Nothing under `src/` moves in Wave 0.

**B. Expo + TypeScript skeleton (`apps/mobile/`)**
2. Project files:
   - `package.json`: exact-pinned versions, the latest stable Expo SDK at least 2 weeks old at implementation, with the
     version recorded in the PR. It contains `expo`, `expo-router`, `react`, `react-native`,
     `react-native-safe-area-context`, `react-native-screens`, `expo-localization`, `typescript`, `jest-expo`,
     `@testing-library/react-native`, `@types/react`.
   - Scripts: `typecheck` (`tsc --noEmit`), `test` (`jest`), `bundle` (`expo export --platform ios --platform android
     --output-dir dist`), `deps:check` (`expo install --check`), `gen:i18n` (`node
     ../../scripts/native/gen-i18n-map.mjs`). `pretypecheck`, `pretest` and `prebundle` each run `gen:i18n`.
   - No React Native Firebase, health, audio, NativeWind or Supabase packages. Those belong to the Wave 1 plans and
     G1/G2.
3. `app.config.ts`:
   - It reads `APP_PROFILE` (`development` | `test-g1`). It **throws** on an unset or unknown profile and on
     `production`, which does not exist in Wave 0.
   - Identifiers are `com.exafy.maxina.dev` (iOS) and `com.vitanaland.app.dev` (Android), so no Wave 0 artefact can ever
     collide with the store apps. The store identifiers (`com.exafy.maxina`, `com.vitanaland.app`, program `:67-68`) are
     added only after G3.
   - No `googleServicesFile` and no plugins needing native credentials.
   - `scheme: "maxina"` is a placeholder. Universal links come in Wave 1.
4. `src/config/env.ts` (in `apps/mobile`): a typed config with `gatewayUrl`, `supabaseUrl` and `dataApiUrl`, all
   **optional and unset in Wave 0**.
   - `assertNotProduction(url)` rejects `gateway.vitanaland.com`, `vitanaland.com`, `inmkhvwdcuyhnxkgfvsb.supabase.co`
     and `preview-aws*.vitanaland.com`. Staging is excluded too: it shares the production database (CLAUDE.md "Why no
     host is exempt").
   - There is **no default URL**, unlike F15 and F16, so a missing value is an error, never a fallback.
5. Expo Router shell. It mirrors no screen yet:
   - `app/_layout.tsx`: Stack, `SafeAreaProvider`, `I18nProvider`.
   - `app/index.tsx`: a neutral placeholder that renders only **existing** catalog keys, `t('common.loading')`
     (`src/i18n/de/common.json`). It has no hardcoded strings and no new i18n keys, because a new key would touch `src/`
     (F6).
   - `app/+not-found.tsx`: renders the existing `errors.pageNotFound` / `errors.pageNotFoundDesc` keys.
6. Native i18n (in `apps/mobile/src/i18n/`):
   - `catalog-map.generated.ts` holds static `require()` maps of `../../../../src/i18n/<locale>/*.json` for all 11
     locales, skipping `_audit.json` (F17). It is **generated at build time and not committed**:
     `scripts/native/gen-i18n-map.mjs` writes it from the pre-scripts (change 2) and it is listed in
     `apps/mobile/.gitignore`. Because the file is never committed, it cannot cause merge conflicts and needs no
     freshness check.
   - The static map is kept because Metro has no `import.meta.glob`. `require.context` is not used because it is
     experimental in Metro.
   - `metro.config.js` adds the repo `src/i18n` folder to `watchFolders` (read-only reuse of the same JSON shards).
   - `t(key, params)` resolves dotted keys and falls back to `de` (same semantics as the web, F17).
   - `localeFromDevice()` uses `expo-localization`. `isRTL(locale)` is true for `ar`. `I18nManager.allowRTL(true)` is
     set in the layout.
   - Wave 0 loads catalogs eagerly. Lazy per-locale loading is a Wave 1 decision, measured on the bundle size this CI
     reports.
7. `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`, because new code is strict from day one.
   `jest.config.js` uses the `jest-expo` preset. `apps/mobile/README.md` covers:
   - how to run it
   - "no production host, ever" (with a pointer to change 4)
   - what waits for which gate
   - the font licence note: Cormorant is SIL OFL 1.1 per Google Fonts, so embedding in app binaries is permitted;
     bundling happens in Wave 1 (program decision 8)

**C. Extraction dependency analysis**
8. `scripts/native/extraction-deps.mjs` (Node, TS compiler API from the root `typescript`, the same approach as F11):
   - **Parse:** every non-test `.ts/.tsx` under `src/`. It collects static, dynamic, `require` and re-export imports and
     resolves `@/`, relative paths, `index` files and `.json`.
   - **Own signals per file, with line numbers:**
     - `dom`: `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `matchMedia` and similar as expression
       roots; type positions are ignored
     - `vite`: `import.meta.env` / `import.meta.glob`
     - `web-pkg`: imports from `scripts/native/web-only-packages.json`, e.g. `react-dom`, `react-router-dom`, `sonner`,
       `lucide-react`, `@radix-ui/*`, `vaul`, `framer-motion`, `embla-carousel-react`, `next-themes`, `html2canvas`,
       `canvas-confetti`, `qrcode.react`, `@daily-co/daily-js`, `recharts`, `@ffmpeg/*`
     - `dom-jsx`: lowercase intrinsic JSX tags
     - `prod-fallback`: string literals containing a production host from change 4's list
   - **Classes:**
     - **A** portable as is
     - **B** portable behind an adapter (only `vite` env and storage signals)
     - **C** web-only

     Transitive class = worst over the import closure, with the first chain that reaches a C module.
   - **Output:**
     - `--json <file>`: per module, class, own signals with lines, blocking chain, and closure size
     - `--md <file>`: a summary by directory (`src/lib`, `hooks`, `integrations`, `config`, `types`, `navigation`,
       `i18n`, `stores`, `contexts`), import cycles inside candidate closures, and a **Candidates** section that judges
       each module named in program §3 (F15–F19) with a recommended Wave 1 action (re-export as is / split data from
       icons / inject config+storage / native-only replacement)
9. `docs/programs/native-app/EXTRACTION-ANALYSIS.md`: the generated snapshot at the merge-base commit, with commit SHA
   and date in its header. It is the input for the Wave 1 extraction plan. CI does **not** fail when it drifts from
   `src/` (it would go stale on every web PR). CI regenerates it on push to `main` and uploads it as an artefact.

**D. Parity ledger**
10. `apps/mobile/parity/ledger.json`: one row per web destination.
    - **Fields:** `key` (screen id, or path for routes without one), `web_path` (`mobileRoute ?? route`), `kind`
      (`screen|overlay|route`), `source` (`registry|exclusion|role-route`), `scope`, `lane`, `status`, `exception`,
      `owner`, `last_parity_check`.
    - **`scope` values:** `in`, `out:system-browser` (admin), `out:excluded` (backoffice/dev/exafy-admin, program F3),
      `out:retired` (`/earthlinks/*`), `pending`.
    - **`lane`:** one of the 14 program Wave 2 lanes.
    - **`status` values:** `not_started|in_progress|native|web_fallback|exception`.
    - Rules live in `scripts/native/parity-scope.json`: the prefix-to-scope map, category/prefix-to-lane map, and
      explicit per-path overrides with a reason. Anything unmatched is `pending` and is reported, not guessed.
11. `scripts/native/parity-ledger.mjs`:
    - **Expected set:**
      - every `screens.json` screen (keyed by id, so tab variants on one path stay separate rows; overlays are
        `kind: overlay`)
      - every `exclusions.json` path
      - every App.tsx page route (F11, redirects/index/catch-all removed) that falls under an exclusion prefix (role
        and business routes)
    - **Native routes:** derived from `apps/mobile/app/**` file names. `(group)` segments are stripped, `[id]` becomes
      `:id`, `[...x]` becomes `*`, and `_layout` / `+not-found` / `+html` are ignored.
    - **`--check` fails on:**
      - (a) an expected entry with no row (message: "add a ledger row — run `node scripts/native/parity-ledger.mjs
        --sync`")
      - (b) a row whose web destination no longer exists
      - (c) `status: native|in_progress` with no matching native file route
      - (d) a native file route with no ledger row (except `/`, the Wave 0 placeholder, listed in `native_only` with a
        reason)
      - (e) `status: exception` or `web_fallback` without a reason
      - (f) a `pending` scope row (forces a scope decision)
    - **`--sync`:** adds missing rows as `not_started` with scope and lane from the rules. It removes only stale rows
      still `not_started`. It is idempotent.
    - **`--report`:** writes counts by scope × lane × status to stdout / `$GITHUB_STEP_SUMMARY`.
    - Wave 0 commits the initial ledger from `--sync`. The sync script computes the row count. At planning time the
      formula gives about 260 rows: 184 `screens.json` screens + 43 `exclusions.json` paths + the App.tsx page routes
      under an exclusion prefix that are not already a registry/exclusion entry (patient 8, professional 8, staff 8,
      `/commerce*` business ≈10, `/partner/connections*` 2 as `out:system-browser`, plus the `/admin`, `/backoffice`,
      `/dev`, `/exafy-admin` routes as `out:*` rows). The PR states the script's exact output.
      Every `pending` row is resolved in `parity-scope.json` before merge.
12. `CLAUDE.md`: one paragraph under "Voice navigation — the screen registry". A page added in `App.tsx` / `screens.json`
    also needs its parity ledger row (`--sync`; `not_started` is fine). NATIVE-CI enforces this. It applies the
    program §7 rule. `src/navigation/registry/README.md` is not edited because it is under `src/` (F6).

**E. CI**
13. `.github/workflows/NATIVE-CI.yml`:
    - **Triggers:** `pull_request` and `push: main` on `apps/mobile/**`, `scripts/native/**`,
      `src/navigation/registry/**`, `src/App.tsx`, `src/i18n/**`, `eslint-rules/**` and the workflow file; plus
      `workflow_dispatch`.
    - **Settings:** `permissions: contents: read`, no secrets, concurrency cancels superseded PR runs, `ubuntu-latest`,
      Node 20 (as in F10). Every step except `deps:check` runs with `EXPO_OFFLINE=1`.
    - **Job `mobile`:**
      - `npm ci --prefix apps/mobile`
      - `deps:check` in its own step **without** `EXPO_OFFLINE`. CI has network access, and the version check needs
        Expo's version data. If this step cannot run reliably in CI, it becomes a local-only check before pushing and
        the PR says so.
      - `gen:i18n` (writes the gitignored catalog map), then `typecheck`, `test`, and
      - `bundle` for iOS and Android (Metro + Hermes on Linux; proves the JS builds for both platforms without macOS)
      - writes bundle sizes to the step summary
    - **Job `parity-ledger`:** installs only the TypeScript compiler, pinned to the root lockfile's version
      (`npm install --no-save typescript@<version from package-lock.json, 5.8.3 today>`). It does not run a full root
      `npm ci`. It then runs `node --test scripts/native/__tests__/`,
      `parity-ledger.mjs --check` and `--report`.
    - **Job `extraction-analysis`:** push to main and dispatch only. Runs the script and uploads JSON + MD artefacts.
      Never fails on drift.
    - The workflow is **not** made a required status check in this PR (branch protection is an admin setting; see Open
      question 2).
14. `eslint.config.js`:
    - Add `apps/mobile/{.expo,dist,android,ios,node_modules}/**` and `apps/mobile/src/i18n/catalog-map.generated.ts` to
      `ignores`.
    - Add one override block for `files: ["apps/mobile/**/*.{ts,tsx}"]`, placed after the base block:
      - `react-refresh/only-export-components` off
      - no `globals.browser`; React Native globals instead (`__DEV__`, `global`, timers, `fetch`, `console`)
      - `no-restricted-globals` bans `window`, `document`, `localStorage`, `sessionStorage` and `matchMedia` (round-2 F10; `navigator` stays allowed, React Native ships a partial one)
      - `no-restricted-syntax` bans `import.meta` (a `MetaProperty` selector)
      - `no-restricted-imports` bans the web clients `@/integrations/supabase/client` and `@/lib/gateway-base`, plus
        relative paths that reach them, with a message pointing to `src/config/env.ts` (change 4)
    - The i18n rules stay on through the existing `**/*.{ts,tsx}` block (F8). The PR-GATE ESLint ratchet covers the new
      files unchanged. Web files are not matched by the override, so their lint result is unchanged.
15. `eslint-rules/no-raw-jsx-text.js`: add `accessibilityLabel` and `accessibilityHint` to `I18N_ATTRIBUTES` (F9). There
    are 0 web uses, so the web lint result is unchanged.
16. `.dockerignore`: add `apps/` (F7). The web image does not change, because `apps/` does not exist on main yet. This
    keeps mobile sources out of the web build context, and also a local `apps/mobile/node_modules`, which the
    top-level `node_modules` line does not match. This entry must never be narrowed to a sub-path. A comment on the
    line says so.

**F. Program bookkeeping (vitana-platform docs PR)**
17. `docs/programs/health-hub/STATUS.md`:
    - Row 8 becomes "Wave 0 Linux scope: <VTID>, in progress / merged" with no blocker.
    - New row 8b "Wave 0 native builds (Android debug + iOS simulator via EAS or GitHub macOS), screenshot tooling,
      Maestro" is blocked on macOS minutes (iOS), G1 (anything that signs in) and G2 (push config).
    - The superseded counts (185 → 184 screens; 433/346 → 429/345, F11–F12) go in the plan's planner notes, not in the
      approved plan text.

## Tests
- **`apps/mobile` (jest-expo, RNTL):**
  - `env.test.ts`: each production and staging host is rejected; an unset value throws and never falls back; no URL
    literal in `src/config` matches the production list.
  - `app-config.test.ts`: an unset, unknown or `production` profile throws; identifiers end in `.dev`; no
    `googleServicesFile`.
  - `i18n.test.ts`: all 11 locales resolve `common.loading` to a non-empty string that is not the key; a missing key
    falls back to `de`; `isRTL('ar') === true` and false for the other 10; the map lists every shard in
    `src/i18n/<code>/` except `_audit.json`.
  - `index.test.tsx`: the placeholder renders the `de` and `en` catalog text and contains no literal user-visible
    string.
- **`scripts/native/__tests__/*.test.mjs` (node --test, fixture trees):**
  - **Ledger:**
    - a missing row fails
    - a stale row fails
    - `native` without a file route fails
    - a file route without a row fails
    - `exception` without a reason fails
    - a `pending` scope fails
    - redirects are never rows
    - an `/admin` route becomes `out:system-browser`
    - tab variants on one path stay separate ids
    - `mobileRoute` is preferred over `route`
    - Expo Router file-name mapping covers `(group)`, `[id]` and `[...x]`
    - `--sync` is idempotent and never deletes a row past `not_started`
  - **Extraction:**
    - signal detection with exact line numbers (window in a type position is not a signal)
    - `@/` and index resolution
    - the transitive class with its blocking chain
    - the prod-fallback detector catches F15/F16-shaped literals
    - cycles are reported
  - **gen-i18n-map:** the generated map lists exactly the shard files on disk in a fixture tree, without
    `_audit.json`; a run writes the same output again (deterministic order).
- **ESLint override (node --test, ESLint `Linter` with the repo config):** in a fixture `apps/mobile` file, `window`,
  `localStorage`, `import.meta.env` and an import of `@/integrations/supabase/client` each error; raw JSX text still
  errors; a web `src/` fixture with `window` is not flagged by the override.
- **ESLint rule (node --test with `RuleTester`):** a raw `accessibilityLabel="Close"` errors; `t()` passes; the existing
  `aria-label` behaviour is unchanged.
- **Root unchanged:** `npm test`, `npm run lint`, `npm run build` and the PR-GATE ratchets stay green. The PR touches no
  file under `src/`, so web Vitest, preview-e2e and STAGING-TESTS-REQUIRED skip or pass ("no deploy path").
- No test calls a network service. CI runs with `EXPO_OFFLINE=1` (all steps except `deps:check`) and no secrets.

## Rollout
1. Spar this plan (same partner, at least two passes), then Gate 1. Allocate the VTID citing the sparring record. Create
   `scope.json` with the paths in Meta.
2. One vitana-v1 PR in the order B → C → D → E. Run local checks (`npm ci --prefix apps/mobile`, typecheck, test,
   bundle, node tests, root lint/test/build). Then push, open the PR, mark it ready when green, and merge.
3. Companion vitana-platform docs PR for STATUS rows 8/8b.
4. Done at merge with green checks. Nothing deploys and there is no Gate 2 (Autonomy Contract). The first `push: main`
   run of NATIVE-CI publishes the extraction artefact and ledger report, which are linked in the PR and in STATUS.
5. Rollback: revert the PR. No web file, data, or configuration outside the repo is touched.

## Out of scope (with the gate each waits for)
- Native builds (`expo prebuild`, Gradle/Xcode), simulators/emulators, Maestro, EAS account and secrets: macOS minutes
  for iOS; row 8b. An Android debug build on Linux is possible; see Open question 3.
- Visual-parity screenshot tooling (web 390×844 on staging + native screenshots): row 8b, and G1 for signed-in screens.
- The ORB audio spike: G1 and a real iOS device (program `:195`).
- Store identifiers, signing, store listings and the iOS payment classification: G3 and owner decision 4.
- React Native Firebase, push, `google-services` files: G2.
- Supabase / gateway clients in the app, auth, any network call: G1 (test environment), Wave 1.
- `packages/core` and `packages/tokens`, npm workspaces, moving any `src/` module, NativeWind, UI kit, shell: Wave 1,
  each with its own sparred plan.
- A What's New entry: not a member-facing feature. Screen registry changes: no App.tsx page is added.

<!-- plan:end -->
