# VTID-05183 — Plan Sparring record (Native app Wave 1, package N1: `@vitana/core` re-export layer, `@vitana/tokens`)

- **VTID:** VTID-05183 (vitana-v1, "N1"). Program: Native app **VTID-05021**, Wave 1 row "`@vitana/core` re-export +
  phased moves; tokens" (program §5), steps (1)–(2) of §3 "Extraction is phased".
- **Sparring session:** `6cf99445-27ed-4e98-b90f-75d8ffaadb02` (`plan_sparring_sessions`).
- **Partner:** the independent `plan-sparring-partner` agent (read-only).
- **Change class:** standard. **Rounds:** 2. **Verdict: CONVERGED.**
- **Plan hash (round 1):** `13e63c0b05cfef20292bcced6e77ddd2f8b817491e6da4b5525f646771557407`
- **Plan hash (final):** `1a605cbbdd0dca0b2a66b0a32a5abad7f4f0fac4d2f58130366f30c9d4afe0ac` — sha256 of the text strictly
  between the plan begin and end markers below.
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session — Gate 1 2026-10-13: owner delegated decisions ("Continue and make the decisions yourself"; "build in parallel … quickest possible"); planner defaults taken (Open questions 1–5: generate the trapped pure code now and split it in move (iii); commit the generated files with drift checks; the NATIVE-CI split closes the web-PR cost; supabase-js at the web's `2.56.0`; seed only the manifest/extract set the Wave 1 lanes need).

The plan was hashed before allocation, so `<VTID>` placeholders are kept verbatim below; for this PR `<VTID>` is
VTID-05183. This PR implements every Change of the plan block plus the round-1 planner responses (folded into the
final plan text below).

## Rounds

| Round | Finding | Severity | Answer |
|---|---|---|---|
| R1 | F1 — NATIVE-CI would run the full mobile job (npm ci, typecheck, test, bundles) on every `src/**` web PR | major | **Accepted** — Change 14: a `changes` job decides; the full `mobile` job runs only for `apps/mobile/**`, `packages/**`, the workflow and the exact paths in the generated `scripts/native/mobile-ci-paths.generated.json` (closure `src/` files, extract sources and assets, token sources), which `core-closure.mjs --check` keeps current; every other `src/**` change runs only the cheap script job. CI-split test added; open question 3 closed |
| R1 | F2 — N1's extract generator and N3's `gen-shell-source.mjs` would be two generators over the same web files | major | **Accepted** (coordinator decision) — `gen-core-extract.mjs` / `extract.json` is the single extraction generator; the extract list covers N3 change 2 in full (F16), incl. the new `Function#name` selector and rewrite (c) (flag asset → path + generated asset map, admitted by the resolver guard); the tokens generator no longer parses `TENANT_CONFIGS` (brand overlay from `@vitana/core/tenants`); exact subpaths/names in the Interfaces table; merge order N1 before N3's code PR |
| R1 | F3 — generated files would be linted by a later `files` block; ESLint precedence unproven | major | **Accepted** — generated files go into the existing global-ignores object; new ESLint fixtures prove ignores, `import.meta`/`window` in `packages/`, the web-client bans in `packages/` and `apps/mobile`, the `@/`/`../src` ban in app code, the allowed re-export, web files unaffected, PR-GATE ratchet counts neutral |
| R1 | F4 — fixture coverage of the lint precedence | minor | **Accepted** — covered by the F3 fixtures |
| R1 | F5 | minor | No change needed |
| R1 | F6 — `assertNotProductionKey` must handle the `sb_publishable_…` key format too | minor | **Accepted** — legacy JWT (payload `ref`) and `sb_publishable_…` (production ref as a `_` segment) both refused; a value in neither format refused as invalid; the URL check stays the primary gate |
| R1 | F7 | minor | No change needed |
| R1 | F8 | minor | No change needed |
| R1 | Q3 — postcss in CI | question | **Confirmed** (F17) — `postcss@8.5.18` and its three dependencies are pure JS in the root lock and install with the existing `npm install --prefix "$RUNNER_TEMP/ts"` pattern |
| R2 | F9, F10 | informational | **CONVERGED** (no open findings) |

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, one VTID (allocated after sparring and Gate 1; sparring record
  `docs/validation/<VTID>/plan-sparring.md`, `scope.json` listing the paths below). One vitana-v1 PR.
- **Program:** Native app VTID-05021, Wave 1 row "`@vitana/core` re-export + phased moves; tokens" (program §5),
  steps (1)–(2) of §3 "Extraction is phased". Step (3) (moves, one module per PR, each gated by the web build +
  Vitest + registry tests) and step (4) (revert a failed move on its own) are not part of this package.
- **Repo / areas (vitana-v1):**
  - new: `packages/core/**` (`package.json` marker, `tsconfig.json`, `README.md` module map, `manifest.json`,
    `extract.json`, `src/**`, `closure.generated.json`), `packages/tokens/**` (`package.json` marker, `README.md`,
    `tokens.config.json`, `src/index.ts`, `src/tokens.generated.ts`, `tailwind-theme.generated.json`),
    `scripts/native/gen-tokens.mjs`, `scripts/native/gen-core-extract.mjs`, `scripts/native/core-closure.mjs`, their
    tests under `scripts/native/__tests__/` (incl. new ESLint fixtures under `__tests__/eslint/`),
    `scripts/native/mobile-ci-paths.generated.json`, `apps/mobile/resolution.js`, `apps/mobile/probe/core-probe.ts`,
    `apps/mobile/tests/core/*.test.ts`, `apps/mobile/tests/tokens/*.test.ts`
  - edited: `apps/mobile/{package.json, package-lock.json, tsconfig.json, metro.config.js, jest.config.js,
    src/config/env.ts, tests/env.test.ts, README.md, .gitignore}`, `scripts/native/extraction-deps.mjs` (one signal),
    `eslint.config.js` (ignores + the Wave 0 override widened to `packages/**` + one import rule),
    `.github/workflows/NATIVE-CI.yml` (triggers, steps), `CLAUDE.md` (one paragraph)
  - **not touched:** `src/**`, `public/**`, `index.html`, `Dockerfile`, `nginx.conf`, root `package.json` /
    `package-lock.json` / `bun.lock`, `vite.config.ts`, `tailwind.config.ts`, `.dockerignore`.
- **What's New:** none (no member-facing feature). **Registry / parity ledger:** no route added (the bundle probe lives
  outside `apps/mobile/app/`). **i18n:** no user-visible string and no new key. **Spotlight:** tokens are derived from
  the contract's own sources and never edited in `packages/tokens`; adding or changing a token stays a Spotlight
  contract change made in `src/index.css` first.
- **Production safety:** nothing here makes a network call. The two client factories have no default endpoint, and no
  production host string may appear anywhere in `packages/**` or in the `src/` modules core reaches (checked in CI and
  on the built bundle). `apps/mobile/src/config/env.ts` stays the one place that refuses production and staging hosts,
  and gains the same check for the Supabase publishable key.
- **Gates:** G1, G2 and G3 (program §2a) are not passed. N1 needs none of them: code and unit tests go ahead. Any
  device or data exit criterion (a signed-in G1 member on a device) belongs to the Wave 1 exit and waits for G1.

## Facts (file:line, origin/main `d7109abf2`)
**Program and Wave 0 baseline**
- F1 Program §3 (`docs/programs/native-app/NATIVE-APP-PLAN.md`) lists what goes into `packages/core`: gateway and
  Supabase clients, query keys and hooks without DOM, types, zod schemas, i18n catalogue loader, business rules such
  as `business-mode.ts`, role switching, drawer/nav configs, registry. It also puts `packages/tokens` "generated from
  `tailwind.config.ts` + `index.css` so web and native share one source". Realtime and Storage sit behind thin
  adapters in core, and every endpoint comes from build configuration.
- F2 `apps/mobile/package.json:19-43`: Expo 57.0.25, React 19.2.3, React Native 0.86.3, TypeScript 6.0.3, jest-expo
  57.0.5. Own lockfile, not a root workspace (README "Package manager" row). The root uses React 18 and TypeScript
  5.8.3 (root lock).
- F3 `apps/mobile/tsconfig.json:2-8`: `strict: true`, `types: ["jest","node"]`, include `**/*.ts(x)`. There is no
  `paths` entry. The root `tsconfig.app.json` is `strict: false` and includes only `src`. `metro.config.js:8` watches
  only `../../src/i18n`. `jest.config.js:5` uses `roots: ['<rootDir>/tests']`. App code imports relatively; nothing in
  `apps/mobile` uses `@/`.
- F4 `apps/mobile/src/config/env.ts`: `BLOCKED_HOSTS` (`:19-24`), staging pattern (`:27`), production Supabase ref
  pattern (`:29`), `assertNotProduction` (`:48-55`), `requireUrl` with no default (`:68-74`), config from
  `EXPO_PUBLIC_*` (`:80-84`). Keys: `gatewayUrl`, `supabaseUrl`, `dataApiUrl` (`:14`). There is no key for the
  Supabase publishable key.
- F5 `eslint.config.js:62-129` is the Wave 0 override for `apps/mobile/**/*.{ts,tsx}`: no browser globals,
  `import.meta` banned, `no-restricted-imports` bans `@/integrations/supabase/client` and `@/lib/gateway-base`
  (`:107-127`). It does not cover `packages/**`.
- F6 NATIVE-CI (`.github/workflows/NATIVE-CI.yml:17-40`) triggers on `apps/mobile/**`, `scripts/native/**`,
  `src/navigation/registry/**`, `src/App.tsx`, `src/i18n/**`, `eslint-rules/**`, `eslint.config.js` and itself. It does
  not trigger on `packages/**`, `tailwind.config.ts`, `src/index.css` or any other `src/` file. Script jobs install
  only the root-lock TypeScript (`:112-116`).
- F7 Deploy paths (vitana-platform `scripts/ci/staging-verify/lib.cjs:47-58`; `AWS-STAGE-DEPLOY-FRONTEND.yml:33-43`):
  `src/**`, `public/**`, `index.html`, `Dockerfile`, `nginx.conf`, `package.json`, `package-lock.json`, `bun.lock`,
  `vite.config.ts`. `packages/**`, `scripts/**`, `apps/**`, `eslint.config.js`, `tailwind.config.ts`, `CLAUDE.md` and
  `.github/workflows/NATIVE-CI.yml` are not deploy paths. These patterns match the repo root only, so
  `packages/core/package.json` is not `package.json`. The web build is `vite build` (`package.json:11`). It bundles
  only what `src/` imports, and Tailwind scans `./src/**` (`tailwind.config.ts:24-29`), so files under `packages/` do
  not change a web byte.

**Dependency analysis: `node scripts/native/extraction-deps.mjs --json` at `d7109abf2` (read-only run)**
- F8 There are 1761 modules. **1074 have the web Supabase client in their runtime closure, and 880 have
  `gateway-base`.** 45 modules that are own-class A are transitively B only because of those two singletons: 28 hooks,
  16 `src/lib` and 1 service. Making the two clients take injected configuration is therefore the move that unblocks
  most data code. It is the first entry of the move order (change 15).
- F9 `src/integrations/supabase/client.ts`:
  - `:10-12` falls back to the production URL and `:14-16` to the production publishable key
  - `:20` reads `VITE_DATA_API_URL`
  - `:27` uses `storage: localStorage`
  - `:25-40` creates the client at module load
  - `src/integrations/supabase/data-routing.ts:13-17` `createDataFetch(supabaseUrl, dataApiUrl, baseFetch)` is pure
    (class A/A)
  - `src/integrations/supabase/types.ts` (the `Database` type, 14 684 lines) is A/A
- F10 `src/lib/gateway-base.ts`: `DEFAULT_GATEWAY_ORIGIN` is the production gateway (`:11`); `resolveGatewayBase` falls
  back to it on empty input (`:19-25`); `:27` evaluates `import.meta.env` at module load. Under Metro, `import.meta.env`
  would be undefined, so this module would silently resolve to production. It must never be bundled by native.
- F11 Portable as is (transitive A):
  - `src/navigation/registry/index.ts`: imports `screens.json` + 9 locale files (`:20-29`); exports `REGISTRY_LOCALES`
    (`:33`), `SCREENS` (`:86`), `getScreen`, `isVoiceTarget`, `screenTitle`, `localeTitles` (`:90-105`)
  - `src/navigation/orb-navigation.ts`: imports only the registry (`:10`); `eventForMarker` (`:53`),
    `planOrbNavigation` (`:66`); uses `URL`/`URLSearchParams` with `searchParams` (`:58-62`)
  - `src/lib/permissions.ts:1-28`
  - all 14 files in `src/types/`
  - A strict type-check of these files plus `data-routing.ts` and `types.ts` (planner probe: ES2022 lib, no DOM)
    reports only missing `fetch`/`URL`/`Request` globals, which `@types/node` and React Native provide. There are no
    strictness errors.
- F12 Trapped pure code (the data and logic are portable, but the file is class C because of a web import):
  - `src/lib/business-mode.ts`: `lucide-react` icons (`:17`) next to pure rules (`:36-88`, `:113-116`); a
    `window.localStorage` store (`:90-139`)
  - `src/config/drawer-nav.config.ts`: icons (`:1-23`), tones (`:37-70`), items (`:72-93`)
  - `src/components/mobile/MobileBottomNav.tsx`: community items (`:19-24`), `BottomNavItem` (`:26-34`),
    `ROLE_NAV_ITEMS` (`:45-58`), `resolveRoleBottomNav` (`:61-63`), inside a component file that imports
    react-router-dom and framer-motion (`:1-15`)
  - `src/hooks/useRole.tsx:12` `UserRole`; `src/hooks/useRoleSwitch.ts` `ROLE_LADDER` (`:33`),
    `MOBILE_EXCLUDED_ROLES` (`:41`), `isUserRole` (`:43`), `computeAvailableRoles` (`:45-56`), in a hook file that
    imports react-router-dom and toasts (`:22-31`)
  - `src/config/role-navigation.ts`: patient/professional/staff drawer rows (`:43-79`) beside admin/backoffice rows
    that pull in the C modules (`:2-4`, `:87-117`)
  - `src/lib/role-switch-destination.ts:13-37`: a pure switch that reads `getCommandHubUrl()` (devHub config,
    `import.meta.env`) only for `developer`/`infra`, which are `MOBILE_EXCLUDED_ROLES`
  - `src/hooks/useTenant.tsx:22-39`: `TENANT_CONFIGS` (brand colours); applied at runtime as CSS variables (`:134-140`)
- F13 Not portable in this package, and why:
  - `src/i18n/index.ts` uses `import.meta.glob` (`:26`, `:40-49`); the native loader already exists
    (`apps/mobile/src/i18n/index.ts`, Wave 0)
  - `src/lib/i18n-toast.ts` imports `sonner`, which blocks 32 modules including `src/lib/locale-format.ts`
  - `src/context/AuthProvider.tsx` blocks 50; `src/hooks/useTenant.tsx` blocks 21
  - `src/lib/query-persist.ts` uses `localStorage` (`:71`, `:100`)
  - `src/integrations/supabase/realtime.ts:213` reads `VITE_REALTIME_URL`
  - Only 2 non-test `src/` files import `zod` (`AddSupplementDialog.tsx`, `useCalendarEvents.ts`), both class C. There
    is no shared zod schema to extract today.
  - Query keys are local to each hook (`useWalletGateway`, `useUniversalCart`, `useShopFeed`, `useAdminRewardShop`);
    there is no central query-key module.
- F14 Analyzer blind spot: `src/stores/newsFeedPreferencesStore.ts:28` and `userInterestsStore.ts:21` call zustand
  `persist(...)` with no `storage` option, which defaults to `localStorage` at runtime. The analyzer classes both as A.
- F15 Tokens:
  - `src/index.css` `@layer base` (`:9`) declares 166 custom properties in `:root` (`:10-228`) and 134 in `.dark`
    (`:230-398`). Every `.dark` name also exists in `:root`; 32 root-only names (`--radius`, `--sp-*`, `--health-*`,
    `--contact-*`, layout heights) inherit in dark mode.
  - Colours are HSL triplets (`--primary: 222.2 47.4% 11.2%`), as the file header requires (`:6`). Non-colour values
    include `--radius: 0.5rem`, `--sp-card-radius: 1.125rem` and the shadows `--sp-elevation-1/2`.
  - More custom properties sit outside the token blocks, as web layout hacks: Appilix offsets (`:716-718`) and the
    Maxina intro ORB (`:797-801`, `:1017-1019`).
  - The Maxina top-app-bar gradient is a class rule, not a variable (`:1462-1465`).
  - `tailwind.config.ts` maps classes to variables: colours (`:58-253`), Spotlight widths, spacing, shadows and radii
    (`:254-280`), fonts (`:47-57`: `editorial` = Cormorant + Georgia + CJK serif list `:20`; `sans` = Tailwind default
    + CJK sans `:19`), screens (`:32-38`, `md` 1024 px = the `useIsMobile` breakpoint).
  - 127 distinct `var(--…)` references; every one is declared in `:root` except `--radix-accordion-content-height`
    (set by Radix at runtime).
  - Tenant brand values live in `useTenant.tsx:22-39`, not in CSS.
- F16 Further shell declarations the N3 plan needs (N3 change 2), all on origin/main:
  - `src/components/mobile/MobileBottomNav.tsx:86-101` `hideNavRoutes` and `:112` `roleSectionRoutes`: literal arrays
    declared **inside** the `MobileBottomNav` function body, not at top level
  - `src/components/mobile/SideDrawerNav.tsx:57` `CROSS_MODE_IDS` and `:61-66` `BUSINESS_DRAWER_KEYS` (top-level,
    non-exported)
  - `src/hooks/useRoleSwitch.ts:58-67` `BusinessSwitchEntry` and `computeBusinessEntries`
  - `src/hooks/useTenant.tsx:11` `TenantType`, `:13-20` `TenantConfig`, `:22-39` `TENANT_CONFIGS` (non-exported)
  - `src/lib/retired-tenants.ts:20-23` `RETIRED_TENANT_SLUGS` and `:36-41` `canonicalTenantSlug` (pure); the same file
    reads `localStorage` elsewhere (F13 class B), which is not extracted
  - `src/contexts/LanguageContext.tsx:29` `languageOptions` (`{label, value, status}`, literal)
  - `src/components/language/locale-presentation.ts:13-16` `LocalePresentation` and `:31` `LOCALE_PRESENTATION`;
    each `flag` is a PNG import from `@/assets/flags/*.png` (`:1-11`)
  - `src/components/RTLProvider.tsx:55` `RTL_BASE_LANGUAGES` and `:57-60` `isRtlLanguage` (pure)
  - Logic written inline in component bodies (`SideDrawerNav.tsx:267-338` row composition, `MobileBottomNav.tsx:114-120`
    hide rule) and storage-backed helpers (`tenant-display.ts:9` reads storage through `readStoredTenantSlug`) are not
    declarations a generator can take. They stay N3's source-pinned ports (N3 change 3).
- F17 NATIVE-CI script jobs install the root-lock TypeScript into `$RUNNER_TEMP/ts` with `npm install --prefix …
  --no-save` and symlink it as `node_modules` (`NATIVE-CI.yml:112-118`). `postcss@8.5.18` (root lock) depends only on
  `nanoid`, `picocolors` and `source-map-js`; none of the four has an install script, `os` or `cpu` field in the root
  lock, so it is pure JavaScript and installs the same way.

## Changes (numbered)
**A. Layout and resolution (no workspace, no root edit)**
1. **`packages/core` and `packages/tokens` are plain folders, not npm workspaces.** Each has a `package.json` marker
   (`"private": true`, name `@vitana/core` / `@vitana/tokens`, no dependencies, no scripts) so that tooling and editors
   name them. They are reached only through aliases. Their third-party imports (`@supabase/supabase-js`) resolve from
   `apps/mobile/node_modules`. Reasons: a root `package.json`/lock edit is a web deploy path (F7), and React 18 (web)
   vs React 19 (native) cannot share one hoisted tree (F2). Whether to adopt npm workspaces is decided by the first
   move package that makes the web import `@vitana/core`.
2. `apps/mobile/resolution.js` is the **one alias table and resolver** used by Metro, Jest and the tests:
   - **Aliases:**
     - `@vitana/core/*` → `packages/core/src/*`
     - `@vitana/tokens` → `packages/tokens/src/index.ts`
     - `@/*` → `src/*`. Inside the bundle, `@/` means the web `src/`, and only core's re-exported modules use it
       (change 13 bans it in app code).
   - **Bare specifiers always resolve from `apps/mobile/node_modules`.** This holds for every importer, including files
     under `src/` and `packages/`, so a developer's local root `node_modules` (React 18, supabase-js 2.56) can never be
     picked up.
   - **Guard:** a file under the repo's `src/` may be resolved only if it is listed in
     `packages/core/closure.generated.json` (change 6). Anything else throws at bundle and test time, naming the module
     and pointing to `packages/core/manifest.json`. The two production-fallback clients (F9, F10) are never in that
     list.
3. `metro.config.js`:
   - `watchFolders` = `../../src` + `../../packages` (replacing the `src/i18n`-only entry, F3)
   - `resolver.nodeModulesPaths` = `[apps/mobile/node_modules]` and `disableHierarchicalLookup: true`
   - `resolver.resolveRequest` comes from `resolution.js`

   `jest.config.js`: `resolver` comes from `resolution.js`, and `roots` stays `tests/`. `tsconfig.json`:
   - `paths` mirror the alias table, plus explicit `paths` for each bare package core uses (`@supabase/supabase-js`),
     pointing into `./node_modules`
   - `include` adds `../../packages/*/src/**/*.ts`
   - a test checks that the `tsconfig.json` paths equal the `resolution.js` table (change 18)

   `strict` stays on, so every `src/` module core reaches is type-checked strictly by the mobile typecheck (F11 shows
   the initial set passes).

**B. `@vitana/core` (re-export layer + extracted declarations + config-only clients)**
4. **Re-exports (transitive class A only), one entry file per area**, each holding `export … from '@/…'`:
   - `registry.ts` → `@/navigation/registry` (F11)
   - `orb-navigation.ts` → `@/navigation/orb-navigation` (F11)
   - `permissions.ts` → `@/lib/permissions`
   - `types.ts` → every module in `src/types/` (type-only re-exports)
   - `database.ts` → `export type { Database } from '@/integrations/supabase/types'`
   - `data-routing.ts` → `createDataFetch` (F9)

   `packages/core/manifest.json` lists each re-exported module with a reason and its consumer lanes. A lane that needs
   another transitive-A module adds a manifest line and a re-export in its own PR. The closure check (change 6) is the
   gate, not this plan. There is no root barrel: subpath entries only (Metro does not tree-shake, so a barrel would pull
   the registry and its locale files into every importer).
5. **Extracted declarations for trapped pure code (F12): generated from the web source, never hand-copied.**
   - `scripts/native/gen-core-extract.mjs` reads `packages/core/extract.json`. Each entry names a source file, the
     declarations to take, which to export, `iconFields`, and optional `stubs` with a reason.
   - It uses the root-lock TypeScript compiler API and prints those declarations verbatim into
     `packages/core/src/extracted/<name>.generated.ts`, with a header naming the source file and commit.
   - **Selectors:** a top-level declaration by name, or `Function#name` for a `const` declared directly in the body of a
     named top-level function whose initializer is a pure literal (used for `MobileBottomNav#hideNavRoutes`, F16).
   - **Only three rewrites are allowed:**
     - (a) An icon identifier in an `iconFields` property becomes its name as a string literal (`icon: Mail` →
       `icon: 'Mail'`). The field's type (`LucideIcon`, `React.ComponentType<…>`, `any`) becomes `IconName`, a
       generated union of the icon names used.
     - (b) An identifier listed in `stubs` is replaced by the given expression. The one N1 stub is
       `getCommandHubUrl → () => null` in `getRoleSwitchDestination`. Its reason: `developer`/`infra` are
       `MOBILE_EXCLUDED_ROLES` (F12), and a test proves those branches are unreachable from `computeAvailableRoles`
       on mobile.
     - (c) An identifier bound to a static asset import (`import deFlag from '@/assets/flags/de.png'`) becomes the
       asset's repo path string. The generator also writes `packages/core/src/extracted/assets.generated.ts`, a
       `require()` map from that path to the file, so Metro bundles exactly those assets. Every asset path is added to
       `closure.generated.json`, so the resolver guard (change 2) admits them and nothing else under `src/`.
   - **The generator fails** when an extracted declaration references any identifier that is not one of the
     following: another extracted declaration, a stub, a TypeScript/ES global, or an import that the closure check
     classes A.
   - **This is the only extraction generator in the program.** N1 owns it for every shell, role, nav,
     business-mode, tenant and language declaration. N3 drops its own `gen-shell-source.mjs` and consumes the subpaths
     below through its port, with a local stub only until N1 merges (round-1 F2).
   - **Initial `extract.json` (covers N3 change 2 in full, plus N2/N4/N6 needs):**
     - `roles`: `UserRole` (`useRole.tsx:12`); `ROLE_LADDER`, `ALL_ROLES_SUPER_ADMIN`, `MOBILE_EXCLUDED_ROLES`,
       `isUserRole`, `computeAvailableRoles`, `BusinessSwitchEntry`, `computeBusinessEntries`
       (`useRoleSwitch.ts:33-67`); `getRoleSwitchDestination`, `isExternalRoleSwitchDestination`
       (`role-switch-destination.ts:13-41`, with the stub)
     - `role-navigation`: the `NavigationItem` interface and `patientNavigation`, `professionalNavigation`,
       `staffNavigation` (`role-navigation.ts:14-79`)
     - `business-mode`: everything in `business-mode.ts` except `readActiveOrgId`, `writeActiveOrgId` and the
       in-memory store (`:95-144`), so also `NON_MODE_COMMERCE_PREFIXES` and the six `BusinessNavItem` constants
     - `drawer-nav`: `DrawerNavItem`, `DrawerIconTone`, `drawerNavIconTones`, `drawerNavItems`; from
       `SideDrawerNav.tsx`: `CROSS_MODE_IDS`, `BUSINESS_DRAWER_KEYS` (F16)
     - `bottom-nav`: `navItems` (exported as `communityBottomNav`), `BottomNavItem`, `ROLE_NAV_ITEMS`,
       `resolveRoleBottomNav` (`MobileBottomNav.tsx:19-63`); `MobileBottomNav#hideNavRoutes`,
       `MobileBottomNav#roleSectionRoutes` (F16)
     - `tenants`: `TenantType`, `TenantConfig`, `TENANT_CONFIGS` (`useTenant.tsx:11-39`); `RETIRED_TENANT_SLUGS`,
       `canonicalTenantSlug` (`retired-tenants.ts:20-41`)
     - `language`: `languageOptions` (`LanguageContext.tsx:29`), `LocalePresentation`, `LOCALE_PRESENTATION`
       (`locale-presentation.ts:13-31`, flags through rewrite (c)), `RTL_BASE_LANGUAGES`, `isRtlLanguage`
       (`RTLProvider.tsx:55-60`)
   - `packages/core/src/tenants.ts` (hand-written) adds `tenantBrand(slug)`: unknown slug → `maxina`, the same fallback
     as `useTenant.tsx:130`, through the extracted `canonicalTenantSlug`.
   - When a module later moves physically (step 3), its entry is deleted and core re-exports the moved module instead.
     The generated file disappears with it.
6. `scripts/native/core-closure.mjs` uses the same graph as `extraction-deps.mjs`:
   - It computes the runtime closure of every `src/` module that `packages/core/src/**` reaches (re-exports and the
     imports kept in extracted files).
   - `--write` writes `packages/core/closure.generated.json`.
   - **`--check` fails on any of:**
     - a module in that closure whose own or transitive class is not A
     - a `prod-fallback` signal anywhere in the closure or in `packages/**`
     - a re-export not listed in `manifest.json`
     - a stale `closure.generated.json`

   `scripts/native/extraction-deps.mjs` gains one signal, `implicit-storage`: a zustand `persist(…)` call without a
   `storage` option is class B (F14). This also corrects the Wave 0 analysis output.
7. **Client factories: new code in `packages/core`, every endpoint injected, no default anywhere.**
   - `config.ts`: `CoreEndpoints = { gatewayOrigin: string; supabaseUrl: string; supabasePublishableKey: string;
     dataApiUrl?: string }`.
     - `gatewayApiUrl(origin)`: trims, strips trailing `/` and `/api/v1` (the same normalisation as
       `resolveGatewayBase`, F10) and appends `/api/v1`.
     - Empty or whitespace input **throws**. There is no fallback origin.
   - `gateway.ts`: `createGatewayFetch({ origin, getAccessToken, fetchImpl })` returns
     `(path, init?) => Promise<Response>`. It requires `fetchImpl` (it never reaches for a global by default) and sends
     `Authorization: Bearer` when the token getter returns one. `gatewayJson<T>(…)` throws a typed `GatewayError` with
     status and the body `{ key, params }` when the gateway sends one (CLAUDE.md "Backend-supplied UI text").
   - `supabase.ts`: `createSupabaseClient({ url, publishableKey, dataApiUrl?, storage })`.
     - It uses `createClient<Database>` with `auth.storage = storage` (required, type `KeyValueStorage`),
       `persistSession: true`, `autoRefreshToken: true` and `detectSessionInUrl: false` (no URL bar on native).
     - `global.fetch = createDataFetch(url, dataApiUrl)` and `realtime.params.eventsPerSecond: 10`, the same as web
       (F9 `:25-40`).
     - It is never called at module load. It throws on an empty `url`, `publishableKey` or a missing `storage`.
   - `storage.ts`: `KeyValueStorage` (`getItem`/`setItem`/`removeItem`, sync or async, the supabase-js storage shape)
     and `createMemoryStorage()` for tests.
   - `active-org.ts`: `createActiveOrgStore(storage)` reproduces `getActiveOrgIdSnapshot` / `setActiveOrgId` /
     `subscribeActiveOrgId` (F12 `business-mode.ts:121-139`) over an injected `KeyValueStorage`, with the extracted
     `ACTIVE_ORG_STORAGE_KEY`.
   - The only new dependency in `apps/mobile/package.json` is `@supabase/supabase-js`, pinned to `2.56.0` (the root
     lock's version, so web and native run the same client), and written to `apps/mobile/package-lock.json`. React
     Query, zustand and zod are not added (F13; N3 adds what the shell needs).
8. `apps/mobile/src/config/env.ts`:
   - It gains `supabasePublishableKey` (from `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, unset).
   - `requireValue` (no default).
   - `assertNotProductionKey(key)` handles both key formats (round-1 F6):
     - a legacy JWT anon key: decodes the payload without verifying it and refuses `ref === 'inmkhvwdcuyhnxkgfvsb'`
       (F9 `:16`)
     - a `sb_publishable_…` key: refuses it when the production ref appears in it as a `_`-separated segment
     - a value in neither format is refused as invalid
     - The URL check on `supabaseUrl` stays the primary gate: a key cannot reach production without the production URL,
       which `assertNotProduction` already refuses.
   - `endpoints(config): CoreEndpoints` returns the four values through `requireUrl`/`requireValue`, so any client
     built from it has passed the host and key checks.
   - It stays the single production gate. A future production store profile (after G3, its own plan) changes env.ts,
     not core.

**C. `@vitana/tokens` (generated, one source)**
9. `scripts/native/gen-tokens.mjs` uses `postcss` (installed in CI at the root-lock version 8.5.18, the same way as
   TypeScript, F6) and the TypeScript compiler API. Driven by `packages/tokens/tokens.config.json`, it reads:
   - `src/index.css`: only the first `@layer base` `:root` and `.dark` rules (F15). `dark` = `light` overlaid with the
     `.dark` declarations, so every light key exists in dark.
   - `tailwind.config.ts` `theme.extend`, statically:
     - `colors`: the class path → variable map (e.g. `status.success.DEFAULT` → `--status-success`)
     - `borderRadius`, `maxWidth`, `spacing`, `boxShadow`, `aspectRatio`
     - `fontFamily.editorial` (literal list with `CJK_SERIF` resolved); `sans` recorded as Tailwind default + `CJK_SANS`
     - `screens`
   - the `.maxina-topbar` gradient rule (F15 `:1462-1465`). Tenant brand values are **not** parsed here; they come
     from the one extractor (`@vitana/core/tenants`, change 5).
   - **Every** custom property declared anywhere in `index.css` must be either a token or listed in
     `tokens.config.json` `excluded` with a reason (the Appilix offsets and the intro-ORB layout variables, F15).
     Otherwise the generator fails, so a new token can never be silently missed.
   - Runtime-only variables referenced by Tailwind (`--radix-accordion-content-height`) are listed in
     `runtimeVars` with a reason.
10. **Outputs (committed, deterministic, sorted keys):**
   - `packages/tokens/src/tokens.generated.ts`:
     - `cssVars.light/dark` (raw triplets and values)
     - `colors` (the Tailwind class vocabulary → variable name)
     - `resolved.light/dark` (each colour as `#rrggbb` plus the `hsl(…)` string)
     - `radius`, `spacing`, `maxWidth`
     - `shadows`: both the raw CSS string and a parsed `{ color, opacity, offsetX, offsetY, blur }`
     - `fonts`, `screens`, `gradients`
   - `packages/tokens/tailwind-theme.generated.json`: the web `theme.extend` colour/radius/spacing map with the same
     `hsl(var(--x))` values, for N2's NativeWind config to spread, so native class names equal web class names.
   - `packages/tokens/src/index.ts` (hand-written, small):
     - `themeVars(scheme, brand?)`: a `{ '--primary': '222.2 47.4% 11.2%', … }` map, the input NativeWind `vars()`
       takes; an optional `{ brandAccent, brandBg, brandFg }` (from `tenantBrand`, change 5) is overlaid as
       `--brand-accent/-bg/-fg`, as `useTenant.tsx:134-140` does on the web
     - `color(name, scheme)`
11. **Drift checks:** `gen-tokens.mjs --check` and `gen-core-extract.mjs --check` regenerate in memory and fail on any
    difference, with the exact command to run. `apps/mobile/package.json` gains the scripts `gen:core` (extract +
    closure write) and `gen:tokens`. They need the root-lock TypeScript/postcss and are therefore run from the repo root
    (`node scripts/native/…`). The README documents both commands.

**D. Analysis record, lint, CI, docs**
12. `packages/core/README.md` is the module map (step 1 deliverable), regenerated by `core-closure.mjs --md` with a
    hand-written header. It lists:
    - what is re-exported and why
    - what is extracted and from where
    - every program §3 candidate that is **not** in core, with its blocking signal (F13) and the move that unblocks it
    - the recommended **move order** for step 3, each its own later sparred package:
      - (i) inject configuration and storage into `client.ts` and `gateway-base.ts` behind the existing exports, with
        no web behaviour change (unblocks the 45 modules of F8)
      - (ii) split `i18n-toast.ts` into a portable `t()` and the `sonner` `notify()` (unblocks `locale-format.ts` and
        32 others)
      - (iii) split icons out of `business-mode.ts`, `drawer-nav.config.ts`, `MobileBottomNav.tsx` and
        `role-navigation.ts` into data files the web imports; each replaces an `extract.json` entry
      - (iv) the realtime router's config (`realtime.ts:213`)
      - (v) `query-persist.ts` storage
13. `eslint.config.js`:
    - adds `packages/*/src/**/*.generated.ts` to the existing **global** ignores object (the block with only `ignores`,
      `:19-30`), so no later `files` block can lint them again (round-1 F3)
    - widens the Wave 0 override's `files` to `["apps/mobile/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"]` (no browser
      globals, no `import.meta`, no web clients)
    - adds one block for `apps/mobile/**`: `no-restricted-imports` patterns `^@/` and `(\.\./)+src/` with the message
      "reach web code only through @vitana/core (packages/core/manifest.json)". `@/` stays allowed in
      `packages/core/src/*.ts`, the re-export files.

    The i18n rules still apply through the existing `**/*.{ts,tsx}` block. Web files match none of the changed blocks.
    Fixtures in `scripts/native/__tests__/eslint/` prove the precedence (Tests). The PR-GATE ESLint and design ratchets
    stay neutral: the new files are clean and no web file's result changes.
14. `.github/workflows/NATIVE-CI.yml`, split so a web PR never pays for the full mobile job (round-1 F1):
    - **Triggers:** the workflow adds `packages/**`, `src/**` and `tailwind.config.ts`.
    - **New first job `changes`** (seconds, no install):
      - It diffs the event's base and head (`pull_request.base.sha`…`head.sha`, or `before`…`sha` on push).
      - `mobile=true` when a changed path matches `apps/mobile/**`, `packages/**`, the workflow file, or an exact path
        in `scripts/native/mobile-ci-paths.generated.json`.
      - That list is the `src/` files in `closure.generated.json`, the source files and assets named in
        `extract.json`, and the token sources (`src/index.css`, `tailwind.config.ts`).
      - `core-closure.mjs --write` generates the list and `--check` fails when it is stale, so it cannot drift from
        what core reads.
      - `workflow_dispatch` always sets `mobile=true`.
    - **`mobile` job** runs only `if: needs.changes.outputs.mobile == 'true'`: `npm ci`, typecheck, test, bundle, then
      `bundle:core-probe`. That probe runs `expo export:embed --entry-file probe/core-probe.ts --dev false --minify
      false` for iOS and Android with a sourcemap. `probe/core-probe.ts` imports every `@vitana/core/*` entry and
      `@vitana/tokens`. A step then asserts:
      - (a) the bundle contains none of the production host strings from env.ts F4 (`inmkhvwdcuyhnxkgfvsb`,
        `gateway.vitanaland.com`, `vitanaland.com` as a URL host)
      - (b) no sourcemap source path lies under the repo-root `node_modules`
      - (c) exactly one `react` package path appears
    - **The cheap script job** (the existing `parity-ledger` job, 10-minute timeout and no `npm ci`, runs on every trigger including
      `src/**`):
      - installs `typescript` and `postcss` at their root-lock versions into `$RUNNER_TEMP/ts` in one
        `npm install --prefix` call (F17)
      - runs the ledger check, `gen-tokens.mjs --check`, `gen-core-extract.mjs --check`, `core-closure.mjs --check`
        (including the CI path list) and the `node --test` files
    - The `lint-rules` job runs the new ESLint fixtures.
    - Still no secrets, `EXPO_OFFLINE=1`, `contents: read`, not a required check.
15. `CLAUDE.md`, one paragraph under "Native parity ledger":
    - "`packages/tokens` and `packages/core/src/extracted/` are generated from web sources (`src/index.css`,
      `tailwind.config.ts`, `useTenant.tsx`, the files in `packages/core/extract.json`). After changing one, run
      `node scripts/native/gen-tokens.mjs` / `node scripts/native/gen-core-extract.mjs`. NATIVE-CI fails on drift."
    - "Native code reaches web code only through `@vitana/core` (`packages/core/manifest.json`)."
16. `apps/mobile/README.md`: replace the "`packages/core`, `packages/tokens` … Wave 1" row with a short section on the
    aliases, the resolution rule, the probe and the two generators. `apps/mobile/.gitignore` adds `probe-dist/`.

## Interfaces exported to other lanes
All imports are subpath imports. Every name is either generated from or re-exported from web code, so web and native
cannot drift silently.
| Import | Exports | Consumers |
|---|---|---|
| `@vitana/core/config` | `CoreEndpoints`, `gatewayApiUrl(origin)` | N3, N4, N5, N6 |
| `apps/mobile/src/config/env.ts` | `config`, `requireUrl`, `requireValue`, `endpoints(config)`, `assertNotProduction`, `assertNotProductionKey` | N3, N4, N5, N6 |
| `@vitana/core/gateway` | `createGatewayFetch`, `gatewayJson`, `GatewayError` | N4 (token registration, app-config), N5 (ingest), N6 (ORB session start) |
| `@vitana/core/supabase` | `createSupabaseClient`, `Database` type | N3 (auth, tenant/role RPCs) |
| `@vitana/core/storage` | `KeyValueStorage`, `createMemoryStorage` | N3 implements a SecureStore-backed `KeyValueStorage`. Note: SecureStore values have a size limit, and a Supabase session can exceed it; that is N3's design point |
| `@vitana/core/registry` | `SCREENS`, `getScreen`, `screenTitle`, `isVoiceTarget`, `localeTitles`, `REGISTRY_LOCALES`, `ScreenDef` … | N3 (route titles), N4 (deep link → screen), N6 |
| `@vitana/core/orb-navigation` | `planOrbNavigation`, `eventForMarker`, `OrbNavigationPlan`, `NavDirectiveContext` | N6 |
| `@vitana/core/roles` | `UserRole`, `ROLE_LADDER`, `ALL_ROLES_SUPER_ADMIN`, `MOBILE_EXCLUDED_ROLES`, `isUserRole`, `computeAvailableRoles`, `BusinessSwitchEntry`, `computeBusinessEntries`, `getRoleSwitchDestination`, `isExternalRoleSwitchDestination`, `NavigationItem`, `patientNavigation`/`professionalNavigation`/`staffNavigation`, `getPermissions`/`canSwitchRole`/`canSwitchTenant` | N3 (RoleSwitcherSheet, drawer) |
| `@vitana/core/business-mode` | `BusinessRole`, `BusinessNavItem`, `BUSINESS_ROUTES`, `NON_MODE_COMMERCE_PREFIXES`, the six business nav item constants, `isBusinessRoute`, `isBusinessRole`, `businessHomeFor`, `businessRoleLabelKey`, `resolveBusinessBottomNav`, `businessDrawerItems`, `pickActiveOrg`, `ACTIVE_ORG_STORAGE_KEY`, `createActiveOrgStore(storage)` | N3 |
| `@vitana/core/nav` | `communityBottomNav`, `BottomNavItem`, `ROLE_NAV_ITEMS`, `resolveRoleBottomNav`, `hideNavRoutes`, `roleSectionRoutes`, `DrawerNavItem`, `DrawerIconTone`, `drawerNavItems`, `drawerNavIconTones`, `CROSS_MODE_IDS`, `BUSINESS_DRAWER_KEYS`, `IconName` | N2 (icon map `IconName` → native icon), N3 |
| `@vitana/core/tenants` | `TenantType`, `TenantConfig`, `TENANT_CONFIGS`, `RETIRED_TENANT_SLUGS`, `canonicalTenantSlug`, `tenantBrand(slug)` | N3 (tenant theming, top bar), N2 |
| `@vitana/core/language` | `languageOptions`, `LocalePresentation`, `LOCALE_PRESENTATION` (flag = asset path), `flagAsset(path)` (from `assets.generated.ts`), `RTL_BASE_LANGUAGES`, `isRtlLanguage` | N3 (language row, RTL) |
| `@vitana/core/types` | every `src/types/*` type | all |
| `@vitana/tokens` | `cssVars`, `colors`, `resolved`, `radius`, `spacing`, `maxWidth`, `shadows`, `fonts`, `screens`, `gradients`, `themeVars(scheme, brand?)`, `color`; `tailwind-theme.generated.json` | N2 (NativeWind preset, primitives), N3 (tenant theming, dark mode, Maxina top-bar gradient) |

Contract rules for the other lanes:
- Never import `src/` directly; ESLint and the resolver guard both stop it.
- Never construct a Supabase or gateway client from a literal URL; always go through `endpoints(config)`.
- Ask N1's manifest (a one-line PR) for a new re-export. A transitive-B/C module cannot be re-exported; it needs a move
  package (change 12 order).

Not in N1, and why: N3's inline-logic ports (`composeDrawerRows`, `drawerRowActive`, `modeTone`,
`shouldHideBottomNav`, `routeGuard`, `getInstantTenantName`, `findActiveLabel`) are not top-level pure declarations
(F16). They stay N3's source-pinned ports and use the N1 data above.

Merge order: N1 merges before N3's code PR, and before the other lanes' code. Until it does, the other lanes code
against the names above (N3 through its port, with a local stub). N1 is the only package
that edits `metro.config.js`, `jest.config.js`, `tsconfig.json`, `resolution.js` and `env.ts`. The other lanes rebase
onto it for their `package.json`/lock additions.

## Tests
- **`apps/mobile/tests/core/` (jest-expo, React Native environment; all network is a fake `fetchImpl`):**
  - `supabase-factory.test.ts`:
    - empty `url`/`publishableKey` or a missing `storage` throws
    - construction calls no fetch
    - a session write goes to the injected memory storage
    - with `dataApiUrl`, a `/rest/v1/…` request goes to the data API and `/auth/v1/…` stays on `url` (fake fetch
      records URLs)
    - `detectSessionInUrl` is false
  - `gateway.test.ts`:
    - `gatewayApiUrl` table: bare origin, trailing slashes, `…/api/v1`, `…/api/v1/` all give `origin/api/v1`; `''` and
      `'  '` throw. This is mirroring the non-empty cases of `src/lib/gateway-base.test.ts`.
    - bearer header present or absent
    - `GatewayError` carries `{ key, params }`
  - `reexports.test.ts`:
    - `SCREENS.length` equals the `screens.json` count
    - `planOrbNavigation` gives the expected plan for a table of registry URLs with and without query strings. This
      proves `URL`/`searchParams` work under React Native (F11 `:58-62`).
  - `roles.test.ts`:
    - `computeAvailableRoles({isMobile:true, isExafyAdmin:true})` excludes `backoffice`/`developer`/`infra`
    - no mobile input can reach the stubbed branch of `getRoleSwitchDestination`
    - `getRoleSwitchDestination('patient') === '/patient/dashboard'`
  - `business-mode.test.ts`: `isBusinessRoute` (`/commerce/join` false, `/commerce/team` true),
    `resolveBusinessBottomNav` per role, and `createActiveOrgStore` over memory storage (key
    `vitana.businessOrgId`; a throwing storage gives `null`, as on the web).
  - `nav.test.ts`: every `IconName` used in `@vitana/core/nav` is in the generated union; every `i18nKey` /
    `translationKey` (including `BUSINESS_DRAWER_KEYS` values) exists in the `de` and `en` catalogs (through the Wave 0
    generated map); `hideNavRoutes` contains `/maxina` and `roleSectionRoutes` has 5 entries.
  - `tenants-language.test.ts`:
    - `canonicalTenantSlug('earthlinks') === 'maxina'`; `tenantBrand('alkalma').brandAccent === '#3B82F6'`;
      `tenantBrand('nope')` equals `tenantBrand('maxina')`
    - `languageOptions` values for `status: 'ga'` map to the 11 Wave 0 `LOCALES`
    - every `LOCALE_PRESENTATION` flag resolves through `flagAsset` to a bundled asset
    - `isRtlLanguage('ar-SA')` is true and `isRtlLanguage('de-DE')` false
  - `resolution.test.ts`:
    - from a fixture file under a temp `src/`, `react` and `@supabase/supabase-js` resolve inside
      `apps/mobile/node_modules`, even when a decoy root `node_modules/react` fixture exists
    - resolving `src/integrations/supabase/client.ts` or `src/lib/gateway-base.ts` throws the guard error
    - the `tsconfig.json` `paths` equal the `resolution.js` alias table
  - `env.test.ts` (extended):
    - a legacy JWT key whose payload `ref` is the production project is refused; a G1-shaped JWT key passes
    - a `sb_publishable_` key containing the production ref is refused; a G1-shaped `sb_publishable_` key passes; a
      value in neither format is refused
    - `endpoints({})` throws for each missing value
- **`apps/mobile/tests/tokens/tokens.test.ts`:**
  - `themeVars('dark')` has every key of `themeVars('light')`
  - `resolved.light['--primary']` is `#0f172a` (222.2 47.4% 11.2%)
  - `tenantBrand('unknown')` equals `tenantBrand('maxina')`
  - every `colors` leaf names a variable present in `cssVars.light` or `runtimeVars`
- **`scripts/native/__tests__/` (node --test, fixture trees):**
  - `gen-tokens`:
    - a fixture css + tailwind config give the expected output
    - an undeclared custom property fails with its name
    - dark overlay semantics
    - HSL → hex rounding
    - shadow parsing
    - `--check` detects a one-character drift
    - output is byte-identical across two runs
  - `gen-core-extract`:
    - verbatim copy of a const and a function
    - a `Function#name` selector takes an inner literal const and fails when its initializer is not a pure literal
    - an asset import becomes its path string and appears in the generated asset map and in the closure
    - icon rewrite (value and type)
    - a stub is applied only where listed
    - an unknown free identifier fails
    - a referenced class-C import fails
    - `--check` drift
  - `core-closure`:
    - a manifest re-export of a B module fails with its chain
    - a `prod-fallback` literal in `packages/**` fails
    - an unlisted re-export fails
    - a stale `closure.generated.json` fails
    - a stale `mobile-ci-paths.generated.json` fails; it lists every closure `src/` file, every `extract.json` source
      and asset, and the token sources
  - `extraction-deps` (extended): `persist(…)` without `storage` is `implicit-storage` / class B; with
    `storage: createJSONStorage(() => x)` it is not flagged.
  - ESLint fixtures in `scripts/native/__tests__/eslint/` (repo `eslint.config.js`, existing harness; round-1 F3/F4):
    - a `packages/core/src/extracted/x.generated.ts` fixture containing `window` and `import.meta.env` reports
      nothing (globally ignored)
    - `import.meta.env` in a `packages/core/src/*.ts` fixture errors
    - importing `@/integrations/supabase/client` or `@/lib/gateway-base` errors in both a `packages/core` and an
      `apps/mobile` fixture
    - `window` in a `packages/core` fixture errors
    - an `apps/mobile` file importing `@/lib/permissions` or `../../src/x` errors
    - `export { SCREENS } from '@/navigation/registry'` in `packages/core/src/registry.ts` passes
    - a web `src/` fixture is unaffected
    - PR-GATE ESLint/design ratchet counts on the branch equal the base
- **Bundle proof (NATIVE-CI `mobile` job):** the core probe bundles for iOS and Android, with the three assertions in
  change 14.
- **CI split:** on the PR itself, a probe commit touching only an unrelated `src/` file shows `mobile` skipped and the
  script job green. Touching `src/navigation/registry/screens.json` runs `mobile`.
- **Web unchanged (proved, not assumed):**
  - The PR diff touches no deploy path (F7), so STAGING-TESTS-REQUIRED reports "nothing deploys" and the stage deploy
    does not run.
  - Locally, `npm run build` on the merge-base and on the branch give identical `dist/` hashes, recorded in the PR.
  - Root `npm test`, `npm run lint` and the PR-GATE typecheck/ESLint/design ratchets stay green.
  - Root Vitest covers only `src/**` and is not affected; the web registry tests are unchanged.
- **Staging:** none. Nothing deploys, and staging verification is read-only by rule. No test touches a Vitana service,
  G1 or production.

## Rollout
1. Spar this plan (same partner, at least two passes), then Gate 1. Allocate the VTID citing the sparring record. Create
   `scope.json` with the Meta paths.
2. One vitana-v1 PR, built in the order A → C → B → D. Tokens first: the probe and N2 need them, and they have no
   dependency on the extract machinery.
   - Local checks: `npm ci --prefix apps/mobile`, typecheck, test, bundle, the probe bundle, node tests, the three
     `--check`s, and root lint/test/build with the dist-hash comparison.
   - Then push, open the PR, mark it ready when green, and merge (Autonomy Contract).
3. Done at merge with green checks. Nothing deploys and there is no Gate 2. The other Wave 1 lanes rebase onto the
   merge.
4. Rollback: revert the PR. No web file, data or external configuration is touched.

## Out of scope
- Physical moves of any `src/` module (step 3) and any web import of `@vitana/core`. Each is its own sparred package
  in the change 12 order, gated by the web build + Vitest + registry tests and a staging suite, because those moves do
  deploy.
- npm workspaces / a root `package.json` change.
- React Query, zustand, zod in the native app; query-key modules (none exist centrally, F13).
- The i18n runtime: `apps/mobile/src/i18n` stays as Wave 0 left it. N3 owns locale state, persistence and RTL, and the
  web `t()` split is move (ii).
- The UI kit, NativeWind config and icon mapping (N2); auth, SecureStore storage, shell, tenant/role switching UI (N3);
  push, deep links, app-config (N4); Health Sync (N5); ORB (N6).
- Realtime and file-storage adapters: interfaces come with the lanes that use them (chat/feed in Wave 2). Realtime's
  config is move (iv).
- Any network call, G1 wiring or production profile (G1/G3, later plans). STATUS bookkeeping in vitana-platform is
  done by the program session for all Wave 1 lanes together, not by this PR.

<!-- plan:end -->
