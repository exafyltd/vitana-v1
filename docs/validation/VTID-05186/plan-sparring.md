# VTID-05186 — Plan sparring record (Native app Wave 1, lane N3: app shell, identity, i18n + RTL, dark mode, tenant theming)

- **VTID:** VTID-05186 (vitana-v1). One VTID, two PRs: **PR-K** (i18n keys `src/i18n/<locale>/native.json`, staging spec; deploy path, Gate 2) and **PR-S** (`apps/mobile/**`, `scripts/native/**`, NATIVE-CI paths; no deploy path, no Gate 2).
- **Program:** VTID-05021 (Native app), Wave 1, lane N3 — `docs/programs/native-app/NATIVE-APP-PLAN.md` §5
- **Sparring session:** `237514f7-79b6-4b66-a9ea-5aeee5610fd2` (`plan_sparring_sessions`)
- **Partner:** `plan-sparring-partner` agent (independent, read-only)
- **Change class:** standard
- **Rounds:** 2 — verdict **CONVERGED**
- **Plan hash (round 1):** `3b1baf24cba8834c1f855f0a38b8edb91d7996d2633ddecb408c04526b6ba9de`
- **Plan hash (final):** `9f0998daf263bbcb4a1aa8d4b062f15efb66f920ac737334509f3bad40dfbca2` — sha256 of the text strictly between the plan:begin and plan:end markers below
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session — Gate 1 2026-10-13: owner delegated decisions ("Continue and make the decisions yourself"; "build in parallel … quickest possible"); planner defaults taken

`<VTID>` in the plan text is VTID-05186 (allocated after approval; the plan was hashed before allocation, so the
placeholder is kept verbatim below).

## Rounds

| Round | Finding | Severity | Planner answer |
|---|---|---|---|
| R1 | CROSS-LANE (coordinator decision: one extraction generator, N1's) | — | accepted (plan changed: N3 consumes `@vitana/core` through ports, branch-only stubs, no second generator) |
| R1 | F1 — SecureStore chunked session writes can race auto-refresh | major | accepted (plan changed: change 8, versioned chunk writes + mutex + retrying reads; race tests) |
| R1 | F2 — business-mode drawer uses a different cross-mode filter than the role branch | major | accepted (plan changed: change 3 names both filters; business-mode test) |
| R1 | F3 — staging check should prove the shard shipped, not only RTL | minor | accepted (plan changed: change 23 checks the `native` namespace and key count in the deployed bundle) |
| R1 | F4 — Apple/Google sign-up lands in maxina first; Alkalma flash | minor | accepted (plan changed: change 10, loader held until the tenant switch; G1 journey watches for it) |
| R1 | F5 — language change must also clear a mismatched `tts_voice` | minor | accepted (plan changed: change 12; `language.test.tsx`) |
| R1 | F6 — ledger `shell` section needs a version bump | minor | accepted (plan changed: change 25, version 2, version 1 still accepted) |
| R1 | Q3 — native Spotlight screen manifest | question | accepted (answered: none in N3; recorded under Out of scope) |
| R2 | — | — | all round-1 findings closed; verdict **CONVERGED** (no new findings) |

Nothing disputed, nothing escalated. The partner's findings are kept verbatim in the sparring session above; the
planner's answers are the "Planner responses — round 1" section at the end of the final plan.

## Final plan

# Native app Wave 1 / N3 — app shell, identity (auth, tenant, roles), i18n + RTL, dark mode, tenant theming (VTID-05021 program, Wave 1)

Planner: Claude Code session, 2026-10-13. Verified against origin/main (vitana-v1 `d7109abf2`, vitana-platform `1e508fb3c`).
This plan covers lane N3 of program Wave 1 (`docs/programs/native-app/NATIVE-APP-PLAN.md` §5 "shell (TopAppBar,
BottomNav incl. ORB slot, SideDrawer, RoleSwitcher, mode pills, sheets); auth, tenant, roles; i18n (11 locales) + RTL
+ dark mode + tenant theming"). It builds on Wave 0 (VTID-05157, merged: `apps/mobile/` Expo SDK 57 skeleton, parity
ledger, NATIVE-CI). It runs in parallel with N1 (`@vitana/core` re-export layer + `@vitana/tokens`), N2 (UI kit
primitives), N4 (push, deep links, app-config), N5 (Health Sync) and N6 (ORB native), and consumes N1/N2 only through
the port interfaces named under **Interfaces**, each with a local stub, so this lane is never blocked by them.
Nothing in this plan calls a production or staging host: every endpoint comes from `apps/mobile/src/config/env.ts`,
which has no default and refuses production and staging. Code and unit tests proceed now (G1–G3 not passed); the
device/data part of the Wave 1 exit criterion waits for G1 and for STATUS row 8b (native builds).

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, one VTID (allocated after sparring and Gate 1; record
  `docs/validation/<VTID>/plan-sparring.md`, `scope.json` listing the paths below). Two vitana-v1 PRs under that VTID:
  - **PR-K (i18n keys, deploy path):** new keys in a new shard `src/i18n/<locale>/native.json` (DE first, then the
    other 10), plus `docs/validation/<VTID>/staging-tests.json` and one read-only Playwright spec. It touches
    `src/i18n/**`, a deploy path (Wave 0 F6), so it deploys to staging, runs STAGING-VERIFY and has a Gate 2.
  - **PR-S (shell, no deploy path):** everything under `apps/mobile/**`, `scripts/native/**` and
    `.github/workflows/NATIVE-CI.yml` (trigger list only). It is done when merged with green checks. No Gate 2.
- **Merge order (cross-lane):** N1 (`@vitana/core` + its single extraction generator `gen-core-extract.mjs`) merges
  before PR-S. Until then PR-S's branch builds against local stubs behind the core port (change 20); the port is
  switched to `@vitana/core` before PR-S merges.
- **Program:** Native app VTID-05021, Wave 1, lane N3. Program §3 "Navigation", "Auth", "Database independence";
  §4 parity ledger; §5 Wave 1 exit criterion ("signed-in G1 member navigates the full shell in all modes … on both
  platforms") — N3 delivers the shell and sign-in half of it; push + deep link is N4.
- **Repo / areas (vitana-v1):**
  - new: `apps/mobile/app/(public)/**`, `apps/mobile/app/(app)/**`, `apps/mobile/src/{auth,shell,identity,theme,ports,navigation}/**`,
    `apps/mobile/tests/**` (new files), `apps/mobile/maestro/shell/**`, `scripts/native/shell-pins.json`,
    `scripts/native/check-shell-pins.mjs`, `scripts/native/__tests__/shell-pins.test.mjs`,
    `src/i18n/<11 locales>/native.json` (PR-K only), `docs/validation/<VTID>/**`, one spec under the repo's staging
    Playwright folder (PR-K only)
  - edited: `apps/mobile/{package.json,package-lock.json,app.config.ts,app/_layout.tsx,app/index.tsx,src/config/env.ts,
    src/i18n/I18nProvider.tsx,README.md,.gitignore,parity/ledger.json}`, `scripts/native/parity-ledger.mjs` (+ its test),
    `.github/workflows/NATIVE-CI.yml` (paths only)
  - **Not touched:** any other file under `src/` (no web component, hook or config is edited — see change 1), root
    `package.json` / lock, `public/**`, `vite.config.ts`, `Dockerfile`, vitana-platform code.
- **Production safety:** no production auth tenant, no production Supabase project, no production or staging gateway
  is configured anywhere. `env.ts` keeps "no default URL"; the production-key check (`assertNotProductionKey`) and
  `supabasePublishableKey` come from N1 (its change 8), N3 only adds non-production-checked URL keys.
  Unit tests mock supabase-js and `fetch`; nothing reaches a network in CI. Every write the shell can perform
  (sign-in/up, `set_role_preference`, `switch_to_tenant_by_slug`, `user_preferences.stt_language`) happens only in
  G1 Maestro runs against the G1 test project. The PR-K staging spec is read-only (sign-in only, like every staging
  spec).
- **Gates:** G1 (STATUS row 5 "queued") — needed for the device/data exit only. G2 (row 6) — not needed (push is N4).
  G3 (row 7) — needed for Sign in with Apple on a device (App ID capability on team 62Q26QSEJW) and for store ids;
  this lane keeps the Wave 0 `.dev` identifiers. Row 8b (native builds) — needed to run anything on a simulator/device.

## Facts (file:line, origin/main)
**Wave 0 skeleton (what N3 extends)**
- F1 `apps/mobile/package.json:18-44`: Expo 57.0.25, expo-router 57.0.23, React 19.2.3, RN 0.86.3, reanimated 4.5.1,
  gesture-handler 2.32.0, safe-area-context 5.7.0, jest-expo 57.0.5, RNTL 13.3.3, TypeScript 6.0.3. No supabase-js,
  secure-store, Apple/Google sign-in, React Query or async-storage yet. Own lockfile, not a root workspace.
- F2 `apps/mobile/app.config.ts:16-35` profiles `development | test-g1`, production throws; `:19-22` ids
  `com.exafy.maxina.dev` / `com.vitanaland.app.dev`; `:44` `scheme: 'maxina'` placeholder ("universal links / App
  Links come in Wave 1"); `:49` plugins `expo-router`, `expo-localization`.
- F3 `apps/mobile/src/config/env.ts:14` keys `gatewayUrl | supabaseUrl | dataApiUrl`; `:19-29` blocked hosts incl.
  `preview-aws*` staging and the production Supabase ref; `:48-55` `assertNotProduction`; `:68-74` `requireUrl`
  (no default); `:80-84` values from `EXPO_PUBLIC_*`, all unset.
- F4 `apps/mobile/src/i18n/index.ts:16` 11 locales, `:40-42` `isRTL` (ar), `:61-65` `translate` with `de` fallback;
  `I18nProvider.tsx:16-21` locale from device; `app/_layout.tsx:11` `I18nManager.allowRTL(true)`; `app/index.tsx`
  is the `/` placeholder listed in the ledger's `native_only`.
- F5 `apps/mobile/parity/ledger.json`: 434 rows (counted from origin/main); lanes = the 14 program Wave 2 lanes in
  `scripts/native/parity-scope.json:3-18` — **there is no shell lane and no row for a shell component** (rows are
  web destinations only). `scripts/native/parity-ledger.mjs:233-235` fails a `native|in_progress` row without a
  native route; `:249-252` fails a native route with no row and not in `native_only`; `:124-140` maps
  `[...x]` → `*`, `(group)` stripped.
- F6 Wave 0 ESLint override for `apps/mobile/**` bans `window`, `document`, `localStorage`, `sessionStorage`,
  `matchMedia`, `import.meta`, and imports of `@/integrations/supabase/client` / `@/lib/gateway-base` (both fall back
  to production). NATIVE-CI triggers (`NATIVE-CI.yml:17-39`) include `src/App.tsx`, `src/i18n/**`,
  `src/navigation/registry/**` but none of the shell source files below.
- F7 `docs/programs/native-app/EXTRACTION-ANALYSIS.md:18-27` recommended Wave 1 actions (N1's lane):
  `business-mode.ts` and `drawer-nav.config.ts` "split data from icons" (class C: `lucide-react`, `window.localStorage`);
  `use-mobile.tsx` "native-only replacement"; `registry/index.ts` class A "re-export as is"; Supabase client and
  gateway-base "inject config+storage". `:51-54` the top blockers are `AuthProvider.tsx` (50 modules),
  `i18n-toast.ts` (32), `useTenant.tsx` (21).

**Web shell (the thing mirrored)**
- F8 `src/components/AppLayout.tsx:435-440` signed-out → `PublicAppShell`, else `AuthedAppLayout`; `:460,463`
  `useRoleRouteEnforcement()` / `useInitialLandingRedirect()` (News `/home` is the landing, `useSmartRouting.tsx:102-110`);
  `:512-516` first-ever mobile load shows a `DelayedLoader` until Guided/Full resolves; `:541` `<MobileAppShell>`;
  `:567` `<MobileBottomNav />`; global overlays `AutopilotPopup`, `WalletPopup`, `VitanaIndexSheet`, `InviteSheet`.
- F9 `src/components/mobile/MobileAppShell.tsx:37-46` edge swipe opens the drawer (`x < 30`, `dx > 50`, `dx > dy`);
  `:59-60` `TopAppBar` + `SideDrawerNav`; `:64` content padding `calc(env(safe-area-inset-top) + 32px)`;
  `:25-27` `calendar:open` overlay event → `/calendar`.
- F10 `src/components/mobile/TopAppBar.tsx:22-30` tenant name from `getInstantTenantName(pathname)` then
  `tenant.name`, `isMaxina` styling, LIVE hidden inside `/comm/live-rooms/`; `:58` 3-column grid `h-8`; `:64` kebab
  `aria-label` `screens.mobile.openNavigationMenu`; `:75` name uppercased; `:91-99` soundscape mute
  (`screens.audio.mute|unmute`); `:106,113` LIVE → `/comm/live-rooms`, `mobileNav.live`. Maxina gradient is
  `.maxina-topbar` (`src/index.css:1462`).
- F11 `src/components/mobile/MobileBottomNav.tsx`: community items inline `:19-24` (`/home`, `/inbox`, `/autopilot`,
  `/comm/events-meetups`, keys `mobileNav.*`); role bars inline `:45-58` (patient 4, professional 4);
  `resolveRoleBottomNav` `:61-63`; business bar from `resolveBusinessBottomNav` `:78-83`; hide routes `:86-101`;
  role-section hide `:112-120`; `:123-131` publishes `body[data-bottom-nav-visible]` for the ORB widget; `:155-173`
  5-column grid with an empty centre spacer for the ORB (`:164-165`); inbox unread badge `:231-237` whose
  `aria-label` is a raw English template (an existing web i18n gap, not copied).
- F12 `src/config/drawer-nav.config.ts:1-23` imports `lucide-react`; `:37-70` icon tones per id/mode; `:72-93` 20
  community rows incl. `__logout__`.
- F13 `src/components/mobile/SideDrawerNav.tsx` (731 lines): `:57` `CROSS_MODE_IDS`; `:61-66` business drawer keys;
  `:208-213` member search (`global_community_profiles`, `is_visible`, `ilike display_name`, limit 6, 300 ms
  debounce); `:238-261` row click (switch-community, logout clears query cache + `vitana-query-cache`, navigate `/`);
  `:267-319` row composition (community rows filtered by `isIAPRestricted()` wallet, patient-results, health-orders,
  commerce; business branch first; role branch from `getRoleNavigation(dbRole)`; cross-mode rows; switch row;
  logout last); `:323-327` mode tone; `:329-338` `isActive` (exact `/discover`, `/commerce`); quick actions
  search/calendar/notifications/autopilot/cart `:477-542` (several raw English `aria-label` templates at
  `:504,512,531,539`); language row from `LanguageOptionsList` + `LOCALE_PRESENTATION` (`:15-16,122-123`).
- F14 `src/lib/business-mode.ts:36-41` `BUSINESS_ROUTES`; `:46-49` `isBusinessRoute`; `:56-58` `businessHomeFor`;
  `:77-88` business bottom bar / drawer rows; `:90-110` active org in `localStorage`; `:118-139` shared in-memory store.
- F15 `src/hooks/useRoleSwitch.ts:33` `ROLE_LADDER`; `:41` `MOBILE_EXCLUDED_ROLES = backoffice, developer, infra`;
  `:45-56` `computeAvailableRoles`; `:88-107` `switchRole` writes then navigates to `getRoleSwitchDestination`
  (`src/lib/role-switch-destination.ts`: admin/staff → `/admin`, professional/patient dashboards, community `/home`,
  developer/infra → external Command Hub).
- F16 RPCs and reads the shell uses (names verified):
  - `useRole.tsx:35` `get_role_preference(p_tenant_id)`; `:67` `set_role_preference(p_tenant_id, p_role)` with
    optimistic cache + rollback `:56-80`.
  - `useMemberships.ts:39` `get_my_permitted_roles()`, fallback `:48` `list_roles_for_active_tenant(p_tenant_id)`.
  - `useTenant.tsx:22-37` `TENANT_CONFIGS` (maxina `#FF7BAC`/`#FFF5F8`, alkalma `#3B82F6`/`#EFF6FF`); `:86,116,155`
    `tenants` reads; `:182` `switch_to_tenant_by_slug(p_tenant_slug)` then `:197` `auth.refreshSession()`; `:149`
    `set_active_tenant` edge function (Exafy admin only); `:230` `localStorage.tenant_slug`.
  - `usePatientAccess.ts:30` `patient_profiles`; `useOrgMembers.ts:83-90` `GET /api/v1/partner-orgs/mine`;
    `GuidedModeProvider.tsx:5` `GET /api/v1/journey/state`; `useUserPreferences.ts:102-103` `user_preferences`
    update (language → `stt_language`, `LanguageContext.tsx:308-310`); `community-gateway.ts:14` gateway calls send
    `Authorization: Bearer <supabase access token>`.
- F17 `src/components/ui/MobileModePill.tsx:12-25` props `{modes: ModeOption[], activeMode, onModeChange}`,
  `:28-37` `findActiveLabel` (dot-notation children); the mode configs live inside 14 screens (`Home.tsx:739`,
  `Messages.tsx:152`, `Health.tsx:173`, `Wallet.tsx:140`, …) — screen-lane data, not shell data.
- F18 `src/components/mobile/RoleSwitcherSheet.tsx` (154 lines) renders through `ResponsivePopover`; keys
  `screens.profile.switchRole`, `screens.mobile.currentModeIs`, `screens.mobile.switchRoleHint`,
  `screens.mobile.businessModesTitle`; business label `businessRoleLabelKey`.
- F19 Theme and direction: `src/main.tsx:108` `next-themes` `defaultTheme="light" enableSystem`;
  `RTLProvider.tsx` `isRtlLanguage` (ar, he, fa, ur) sets `dir` on `<html>`; `LanguageContext.tsx:29-78` language
  values are `de-DE`, `en-US`, …, `ar-XA`; `:261` mirror in `localStorage['vitana.lang']`.

**Auth (web today)**
- F20 `src/context/AuthProvider.tsx:117` `onAuthStateChange`; `:93-110` VTID-03652 timeouts so `loading` never hangs;
  `:451-473` `signOut({ scope: 'local' })`; `:14-30` clears ORB/`vitana.auth*` keys.
- F21 `src/pages/portals/MaxinaPortal.tsx` (877 lines): `:320` `signInWithPassword`; `:373-380` `signUp` with
  `emailRedirectTo: getEmailRedirectUrl('/maxina?confirmed=true')` and `data.tenant_slug: 'maxina'`; `:407-420`
  Apple/Google through `useSupabaseOAuthSignIn` with `queryParams.tenant_slug`; `:175-181` signed-in users go to
  `/onboarding/welcome[?redirectTo=]`; `:99,142,208` `setTenantBySlug('maxina')`. `AlkalmaPortal.tsx:144` same for
  alkalma. `src/utils/redirectUrls.ts` hardcodes `PUBLIC_BASE_URL = "https://vitanaland.com"`.
- F22 `useSupabaseOAuthSignIn.ts:40-62` the Appilix WebView path does a browser round trip back to
  `/oauth/complete?return=mobile`. Routes (`App.tsx`): `/maxina` `:875`, `/alkalma` `:877`, `/reset-password` `:843`,
  `/logout` `:849`, `/oauth/complete` `:828`, `/auth` → `/maxina` `:830`, `/login` and `/register` → `/` `:820-821`.
- F23 vitana-platform: `supabase/migrations/20261014000200_vtid_05149_signup_default_tenant.sql:1-22`
  `handle_new_user()` enrols a new user into `raw_user_meta_data.tenant_slug` (open-signup tenants only) or the
  `is_default` tenant; `20261014000100_…:17,36` the default is **maxina**.
  `20261010180200_vtid_05043_…:1-30` `switch_to_tenant_by_slug` joins open-signup tenants (maxina, alkalma) and is
  write-free for an existing member. `supabase.auth.signInWithIdToken` carries no user metadata, so a native
  Apple/Google **sign-up** lands in maxina by the default rule (same as web for Maxina; see Open question 3 for Alkalma).

**Navigation registry**
- F24 `src/navigation/registry/index.ts:86` `SCREENS` (184 screens), `:99` `screenTitle(s, locale)`, class A
  (F7); `screens.json` uses `:param` names that differ per screen (`/inbox/u/:recipient_id`, `/u/:identifier`) and
  query-string `mobileRoute`s (`/settings?mode=billing`, `/comm/events-meetups?tab=hot`);
  `src/navigation/orb-navigation.ts:66` `planOrbNavigation(url, ctx, {isMobile})` (N6 consumes it).

## Changes (numbered)
**A. Shell data from `@vitana/core`, inline component logic as pinned ports (no web edit)**
1. **No file under `src/` is edited in PR-S.** N3 does **not** run its own extraction generator: N1's
   `gen-core-extract.mjs` / `extract.json` is the program's only one, and its extract list already covers everything
   the shell needs (N1 round-1 F2). The shell rules that are inline in web component bodies
   (`SideDrawerNav.tsx:267-338`, `MobileBottomNav.tsx:114-120`, `useSmartRouting.tsx:23-100`) are guarded by existing
   source-text tests (`SideDrawerNav.role-chrome.test.ts`, `business-modes.test.ts`,
   `SideDrawerNav.health-orders-nav.test.ts` read the component files), so moving them stays a follow-up (Open
   question 1).
2. **Consumed from `@vitana/core` (through `src/ports/core.ts`, names as in N1's Interfaces table):**
   - `@vitana/core/nav`: `communityBottomNav`, `ROLE_NAV_ITEMS`, `resolveRoleBottomNav`, `hideNavRoutes`,
     `roleSectionRoutes`, `drawerNavItems`, `drawerNavIconTones`, `CROSS_MODE_IDS`, `BUSINESS_DRAWER_KEYS`,
     `BottomNavItem`, `DrawerNavItem`, `IconName`
   - `@vitana/core/business-mode`: `BUSINESS_ROUTES`, `NON_MODE_COMMERCE_PREFIXES`, the six nav item constants,
     `isBusinessRoute`, `isBusinessRole`, `businessHomeFor`, `businessRoleLabelKey`, `resolveBusinessBottomNav`,
     `businessDrawerItems`, `pickActiveOrg`, `ACTIVE_ORG_STORAGE_KEY`, `createActiveOrgStore(storage)`
   - `@vitana/core/roles`: `UserRole`, `ROLE_LADDER`, `MOBILE_EXCLUDED_ROLES`, `computeAvailableRoles`,
     `computeBusinessEntries`, `BusinessSwitchEntry`, `getRoleSwitchDestination`, `isExternalRoleSwitchDestination`,
     `patientNavigation` / `professionalNavigation` / `staffNavigation`
   - `@vitana/core/tenants`: `TENANT_CONFIGS`, `TenantType`, `TenantConfig`, `canonicalTenantSlug`, `tenantBrand(slug)`
   - `@vitana/core/language`: `languageOptions`, `LOCALE_PRESENTATION`, `flagAsset(path)`, `isRtlLanguage`
   - `@vitana/core/registry`: `SCREENS`, `getScreen`, `screenTitle`; `@vitana/core/supabase`, `/gateway`, `/config`,
     `/storage` (Interfaces I-N1.1–I-N1.2)

   **Local stub until N1 merges:** `src/ports/core.stub.ts` re-implements exactly these exported names by hand for
   the branch's unit tests only, with a `// STUB(N1)` header; it is deleted when the port points at `@vitana/core`,
   which happens before PR-S merges (merge order in Meta), so no hand copy ever reaches `main`.
3. **Inline component logic mirrored with a source pin** (code that lives inside web component/hook bodies, which no
   extractor can export). Native ports in `apps/mobile/src/shell/logic/`, same names and behaviour:
   - `composeDrawerRows({dbRole, isPatient, isPartnerOrgMember, iapRestricted, business})` ← `SideDrawerNav.tsx:267-319`.
     **The business branch and the role branch use different cross-mode filters, and the port keeps both:**
     - business mode (`:284-285`) keeps only the hardcoded subset `['patient-results', 'support', 'settings']`, so
       `commerce`, `health-orders` and the logout row are **not** taken from that filter (logout is appended
       separately after the switch row, `:286-295`);
     - the role branch (`:308-309`) filters by `CROSS_MODE_IDS` (`commerce`, `patient-results`, `health-orders`,
       `support`, `settings`, `logout`) minus routes the role navigation already lists, logout excluded from the
       filter and appended last.
   - `drawerRowActive(pathname, route, exact)` ← `:329-338`; `modeTone(...)` ← `:323-327`
   - `shouldHideBottomNav(pathname, hasModeBar)` ← `MobileBottomNav.tsx:114-120` (data from `@vitana/core/nav`);
     the bar choice business → role → community ← `:78-83`
   - `routeGuard(pathname, dbRole)` ← `useSmartRouting.tsx:13,23-100` (community bounced off role sections on mobile)
   - `getInstantTenantName(pathname, storedSlug)` ← `tenant-display.ts` (storage injected)
   - `findActiveLabel` ← `MobileModePill.tsx:28-37`

   `scripts/native/shell-pins.json` records, per mirrored web range, the file, the enclosing declaration and a sha256
   of its AST text (whitespace/comments normalised); `scripts/native/check-shell-pins.mjs` (node, TS compiler API)
   fails when the web text changes and the pin was not updated, with the message "web shell rule changed — update
   apps/mobile/src/shell/logic/<file> and its pin". It is a checker only, not a generator. A ported function is
   deleted as soon as the web original becomes a pure module that N1's extractor can export.
4. `NATIVE-CI.yml` paths gain the pinned web files (`src/components/mobile/{MobileBottomNav,SideDrawerNav,TopAppBar,
   MobileAppShell,RoleSwitcherSheet}.tsx`, `src/components/ui/MobileModePill.tsx`, `src/hooks/useSmartRouting.tsx`,
   `src/lib/tenant-display.ts`) where N1's generated `mobile-ci-paths.generated.json` does not already list them, so a
   web PR that changes the shell gets the (non-required) red check — the program §7 rule.

**B. Configuration (extends Wave 0 `env.ts`, no production default ever)**
5. `env.ts`:
   - URL keys gain `authRedirectUrl` (base for e-mail confirm / reset links) and `webBaseUrl` (where admin consoles
     would open in the system browser); both optional, unset in `development` and `test-g1` until G1 names them, and
     both go through `assertNotProduction` like the existing keys.
   - Non-URL keys `googleWebClientId`, `googleIosClientId` (`EXPO_PUBLIC_*`), no defaults, read with N1's
     `requireValue`. `supabasePublishableKey`, `requireValue`, `assertNotProductionKey` and `endpoints(config)` are
     N1's (N1 change 8); N3 does not add a second key check.
   - A missing value renders the `ConfigMissing` screen (change 15) in the app and throws in tests. No code path
     builds a URL from a literal.
6. `app.config.ts`: plugins add `expo-secure-store`, `expo-apple-authentication` (iOS `usesAppleSignIn: true`),
   `@react-native-google-signin/google-signin` (its `iosUrlScheme` from `googleIosClientId`, plugin omitted when
   unset, so `development` builds without Google config). `scheme` stays as Wave 0 left it; the link scheme and
   universal links are N4's (Interfaces I-N4). Identifiers stay `.dev`.

**C. Auth (supabase-js, session in Keychain/Keystore)**
7. Dependencies (exact pins, each ≥ 2 weeks old, chosen with `expo install` for SDK 57 where it has an opinion):
   `@supabase/supabase-js` (same major as the web, `^2.56` root), `expo-secure-store`, `expo-apple-authentication`,
   `expo-crypto` (nonce), `expo-web-browser` (Android Apple, change 10), `@react-native-google-signin/google-signin`,
   `@react-native-async-storage/async-storage` (per-device conveniences only), `@tanstack/react-query` (same major 5
   as the web). Versions are recorded in the PR.
8. `src/auth/secure-storage.ts`: N1's `KeyValueStorage` (`@vitana/core/storage`) over `expo-secure-store` that
   splits values into ≤ 1,800-byte chunks because a Supabase session JSON exceeds SecureStore's 2,048-byte guidance;
   `keychainAccessible: AFTER_FIRST_UNLOCK`. **Writes are made safe against auto-refresh racing a read:**
   - one in-process async mutex serialises every `setItem` / `removeItem` (and the multi-key part of `getItem`);
   - `setItem` writes chunks `.n … .0` first, then `<key>.count` **last**, then bumps `<key>.version`;
     `removeItem` bumps `<key>.version`, deletes `<key>.count` first, then the chunks;
   - `getItem` reads `<key>.version`, `.count`, the chunks, then `<key>.version` again; if the version changed or a
     chunk is missing it retries (at most 3 times, then returns `null` = signed out), so it never returns a session
     assembled from two writes;
   - stale chunks beyond a new, shorter `count` are deleted after the `count` write.

   Every SecureStore call is try/catch: a failed read is "signed out", never a crash. No session ever touches
   AsyncStorage.
9. `src/auth/client.ts` + `AuthProvider` (native):
   - The client comes from `createSupabaseClient({ url, publishableKey, dataApiUrl, storage: secureStorage })`
     (`@vitana/core/supabase`, built from `endpoints(config)`), which already sets `persistSession`,
     `autoRefreshToken` and `detectSessionInUrl: false`. N3 needs `flowType: 'pkce'` for the Android Apple flow
     (change 10) and asks N1 for an optional `auth` override in the factory options (Interfaces I-N1.1); until it
     exists, the port passes it through the stub. `AppState` active/background calls `startAutoRefresh` /
     `stopAutoRefresh`.
   - Same context shape as the web `useAuth()` (`session`, `user`, `loading`, `signOut`), same "loading never hangs"
     timeout behaviour as `AuthProvider.tsx:93-110` (same constants, read from that file at implementation time and
     pinned), `signOut({ scope: 'local' })` then clears the React Query cache, the persisted query cache, the active
     org id and the tenant slug — the native equivalents of `SideDrawerNav.tsx:251-257` and `AuthProvider.tsx:14-30`.
   - `getAccessToken()` is exported for the gateway client (I-N1.2), N4 (push token registration) and N6 (ORB socket).
10. Sign-in methods (screen in change 16):
    - **Email/password:** `signInWithPassword`; sign-up with `emailRedirectTo` built from `authRedirectUrl` +
      `/maxina?confirmed=true` (or `/alkalma`) and `data.tenant_slug` exactly as `MaxinaPortal.tsx:373-380`; password
      reset via `resetPasswordForEmail(email, { redirectTo: authRedirectUrl + '/reset-password' })`. When
      `authRedirectUrl` is unset the two e-mail actions show `ConfigMissing`, never a production URL (F21's
      `PUBLIC_BASE_URL` is not imported).
    - **Apple, iOS:** `expo-apple-authentication` with a SHA-256 hashed nonce (`expo-crypto`) →
      `signInWithIdToken({ provider: 'apple', token: identityToken, nonce: rawNonce })`; the full name Apple returns
      only on first sign-in is written once with `auth.updateUser({ data: { full_name } })`.
    - **Google, both platforms:** `@react-native-google-signin/google-signin` configured with `googleWebClientId`
      (+ `googleIosClientId`) → `signInWithIdToken({ provider: 'google', token: idToken, nonce? })` (nonce when the
      SDK version supports passing it; otherwise see Open question 4).
    - **Apple, Android** (no native Apple SDK): `signInWithOAuth({ provider: 'apple', options: { redirectTo:
      <app link to /oauth/complete>, skipBrowserRedirect: true } })` → `WebBrowser.openAuthSessionAsync` →
      `exchangeCodeForSession(code)` on the native `/oauth/complete` route — the same path the web uses (F22).
    - After any successful sign-in: `setTenantBySlug(<portal tenant>)` and navigation to `/onboarding/welcome
      [?redirectTo=]`, as `MaxinaPortal.tsx:175-208`. `/onboarding/welcome` is a public-auth lane screen; until it is
      native the unported screen (change 14) shows.
    - For an Apple/Google **sign-up** the `handle_new_user` default (F23) makes **maxina the primary tenant**; for an
      Alkalma sign-up, tenant-scoped reads can briefly reflect maxina until `switch_to_tenant_by_slug('alkalma')` +
      `refreshSession` complete. The shell keeps the delayed loader up until the switch resolves (or its timeout), and
      the G1 Alkalma journey explicitly watches for a maxina flash (top bar name, accent); if seen, the platform
      follow-up in Open question 3 is raised as a priority.
    - Errors map through the same keys as `src/lib/oauthErrors.ts` (`friendlyOAuthError`), via the i18n port.
    - Provider configuration exists **only** for the G1 test project (Apple Services ID / key, Google OAuth clients,
      redirect allow-list for the dev app link). Nothing is configured on the production auth tenant.

**D. Identity: tenant, roles, business mode, language, guided mode**
11. `src/identity/` providers, each a thin native twin of the web hook with the same return shape:
    - `TenantProvider`/`useTenant`: active tenant from `app_metadata.active_tenant_id`, else stored slug (no URL slug
      on native), `tenants` read, `TENANT_CONFIGS` merge, `setTenantBySlug` → `switch_to_tenant_by_slug` →
      `auth.refreshSession()` → re-read, persisting `tenant_slug` in AsyncStorage (`useTenant.tsx:169-240`).
      `setActiveTenant` (Exafy admin, edge function `set_active_tenant`) is not ported — an admin action.
    - `useRole`: `get_role_preference` / `set_role_preference` with the same optimistic update + rollback
      (`useRole.tsx:35-80`), emitting `role.changed` on the native event bus (change 19).
    - `useMemberships`: `get_my_permitted_roles` with the `list_roles_for_active_tenant` fallback.
    - `usePatientAccess` (`patient_profiles` read), `useMyPartnerOrgs` (`GET /api/v1/partner-orgs/mine` via the
      gateway port), `useBusinessMode` (route-based, active org id in AsyncStorage + the in-memory store semantics of
      `business-mode.ts:118-139`), `useRoleSwitch` (logic from change 3; `isMobile` is always true on native).
    - `GuidedModeProvider`: `GET /api/v1/journey/state`, cached per user in AsyncStorage; the shell shows the
      delayed loader until the first resolution, as `AppLayout.tsx:512-516`.
    - Admin/staff destination `/admin` (F15) and developer/infra external destinations go through
      `openWebConsole(path)`: opens `webBaseUrl + path` in the system browser (program decision 7); with `webBaseUrl`
      unset (every non-production profile) it opens the `native.adminInBrowser` sheet instead. Never a production host.
12. Language: the drawer's language row writes the selection like `LanguageContext.tsx:250-310` —
    local first (AsyncStorage `vitana.lang`), then, when signed in, `user_preferences` gets `stt_language` and —
    when the stored `tts_voice` does not start with the new language — also `tts_voice: null` in the same update
    (`LanguageContext.tsx:303-311`), and the initial value from `user_preferences.stt_language`, else device locale (Wave 0
    `localeFromDevice`), else `de`. Language values stay the web's (`de-DE`, `ar-XA`, …); the I18nProvider maps them to
    catalog codes. Only `status: 'ga'` options are listed (all 11 today).
13. Direction, theme, tenant theming:
    - **RTL:** `rtl = isRtlLanguage(language)`; the shell root view sets `style.direction` so a language change flips
      layout without a restart, and `I18nManager.forceRTL(rtl)` is applied for the next cold start (system
      components); every shell style uses `start/end` (`marginStart`, `paddingEnd`, `textAlign: 'auto'`), never
      `left/right`. The kebab, drawer side and edge-swipe edge follow what the web renders in `ar` (Open question 5).
    - **Dark mode:** `ThemeProvider` with `light | dark | system`, **default `light`** like `main.tsx:108` (not
      system), choice persisted per device in AsyncStorage; colours from the tokens port (I-N1.4) for `light`/`dark`.
    - **Tenant theming:** brand accent/bg/fg from `TENANT_CONFIGS` exposed as theme values; Maxina top bar gradient
      from the tokens port (`.maxina-topbar`, F10). The DB brand pack (VTID-05150, "nothing reads the new columns in
      this slice") is not consumed.

**E. Routes (Expo Router, paths identical to web)**
14. Route tree:
    - `app/_layout.tsx`: `SafeAreaProvider` → `QueryClientProvider` → `ThemeProvider` → `AuthProvider` →
      `TenantProvider` → `I18nProvider` (language from change 12) → `GuidedModeProvider` → `OverlayHost` → `Stack`.
    - `app/index.tsx` (`/`): replaces the Wave 0 placeholder with the landing redirect — signed-in → `/home`,
      signed-out → `/maxina` (`useSmartRouting.tsx:102-110`). Stays in `native_only` with an updated reason (web `/`
      is `PUBLIC.LANDING`, a public-auth lane screen).
    - `app/(public)/maxina.tsx`, `alkalma.tsx`, `reset-password.tsx`, `logout.tsx`, `oauth/complete.tsx`: no shell
      chrome (they are in the web's bottom-nav hide list, F11 `:86-101`).
    - `app/(app)/_layout.tsx`: `AuthGate` (signed-out → `/maxina?redirectTo=<path>`; `routeGuard` from change 3) +
      `MobileAppShell` (change 17) around a `Stack`. Bottom-bar taps call `router.navigate(path)` (no tab
      navigator state — the web remounts the page on every tab tap, `MobileBottomNav.tsx:139-148`).
    - `app/(app)/[...path].tsx`: the **resolver route**. It matches the full path + query against the web
      destinations already listed in `apps/mobile/parity/ledger.json` (every screens.json `route`/`mobileRoute`,
      exclusions path and App.tsx role route — the expected set of `parity-ledger.mjs:63-91`, kept current by
      `--check`), so no new generator is added. Signed-out access is allowed only for the guest paths in
      `src/navigation/guest-paths.ts`, a hand list that `check-shell-pins.mjs` compares with the App.tsx routes
      wrapped in `<AuthGuard allowGuest>` (8 today) — a check, not a generator. A known destination renders `Unported`
      (registry title via `screenTitle(s, locale)` + `native.unported.*` text, shell visible); an unknown path renders
      not-found (`errors.pageNotFound`). Lanes replace this per screen by adding concrete route files, which Expo
      Router ranks above the catch-all.
    - `app/+not-found.tsx` stays as Wave 0 left it.
    - Ledger: `native_only` gains `/*` ("resolver route: registry destinations not yet native render Unported,
      unknown paths render not-found; internal builds only — program decision 4").
15. `ConfigMissing` screen: shown when a required config value is unset; lists the missing key names (no values).
16. Auth screens (`(public)`): the **functional** sign-in/sign-up/reset/logout surface of `MaxinaPortal`,
    `AlkalmaPortal`, `ResetPassword`, `Logout`, `OAuthComplete`, with the web's i18n keys (`portals.maxina.*`, etc.)
    and the same tabs/fields/validation/order. The portal's visual extras (intro video, events teaser, Orb
    discovery hint, `WebViewDiagBadge`) stay with the public-auth lane, so these ledger rows go to `in_progress`,
    not `native` (change 24).

**F. Shell components (built on the UI port, same props/behaviour as the web)**
17. `MobileAppShell`: TopAppBar + SideDrawer + content inset 32 px + top safe area (F9) + edge-swipe gesture
    (gesture-handler, same thresholds `x < 30`, `dx > 50`, `|dx| > |dy|`) + BottomNav + ORB slot; `calendar:open`
    overlay event → `/calendar`; first-load delayed loader while guided mode resolves.
18. Components in `src/shell/components/`:
    - `TopAppBar` (F10): 3-column layout, kebab with `screens.mobile.openNavigationMenu`, tenant name uppercased and
      truncating, Maxina gradient vs plain bar, soundscape mute through the soundscape port (stub keeps the muted flag
      only; audio is not in N3), LIVE pill (`mobileNav.live`) hidden in `/comm/live-rooms/*`.
    - `BottomNav` (F11): items from `resolveBottomNav`, 5 equal columns with the **ORB slot** in the centre (I-N6),
      active state = same `NavLink` matching (prefix, `exact` for business items), active underline (reanimated),
      inbox unread badge from the badges port (I-SH.3) with an i18n `accessibilityLabel` (`native.a11y.unread`),
      hidden per `shouldHideBottomNav`; publishes `bottomNavVisible` to the ORB slot (the native form of
      `body[data-bottom-nav-visible]`).
    - `SideDrawer` (F13): profile header (avatar, display name from `profiles`, mode pill opening
      `RoleSwitcherSheet`, org chip, Exafy-admin badge), quick actions (search → inline member search on
      `global_community_profiles` exactly as `:208-213`, submit → `/search?q=`; calendar → `/calendar`;
      notifications → overlay `notifications:open`; autopilot → overlay `autopilot:open`; cart → `/universal-cart`;
      badge counts from the badges port), rows from `composeDrawerRows` with icon tones, `isIAPRestricted` =
      `Platform.OS === 'ios'` (today's Appilix iOS rule, program decision 5 default), active row via
      `drawerRowActive`, logout/switch-community actions, language row → language sheet (`LanguageOptionsList`
      equivalent with `LOCALE_PRESENTATION` flags).
    - `RoleSwitcherSheet` (F18): two radiogroups (Vitana modes, business modes), current-mode line, switching state;
      hides the ORB slot and bottom bar while open (`business-modes.test.ts` "open sheet hides the ORB button").
    - `MobileModePill` + `ModeSheet` (F17): same props (`modes`, `activeMode`, `onModeChange`), dot-notation groups,
      auto-expanded active group. Screen lanes pass their own `ModeOption[]`; N3 ships the component only.
    - `PublicShell` (signed-out guest routes, `PublicAppShell.tsx`): search + sign-in buttons, used by the resolver
      for `allowGuest` destinations.
19. `src/navigation/`: `resolveWebPath(url)` (parse path + query, match the manifest, return
    `{ kind: 'native'|'unported'|'not-found'|'external-console', href }`), `navigateToWebPath(url)` (used by
    drawer/bottom bar, N4 deep links/push and N6 directives), and an overlay event bus with the web's event names
    (`calendar:open`, `autopilot:open`, `wallet:open`, `notifications:open`; `overlay-bus.ts`) so lanes register
    their sheets later.

**G. Ports and stubs (how N1/N2 are consumed — details under Interfaces)**
20. `src/ports/ui.tsx` (N2), `src/ports/core.ts` + `src/ports/tokens.ts` (N1), `src/ports/badges.ts`,
    `src/ports/soundscape.ts`, `src/ports/orb-slot.tsx` (N6), `src/ports/links.ts` (N4). Every shell file imports
    only from `src/ports/*`, never from a lane package directly; an ESLint `no-restricted-imports` entry in the
    existing `apps/mobile/**` override is **not** added (it would edit `eslint.config.js`, a shared file) — instead a
    jest test greps `src/shell/**` and `src/auth/**` imports.
21. Swap rule: when N1/N2 merge, each port file changes its implementation in one PR; no shell file changes. Each
    stub carries a `// STUB(N1|N2): replace with …` header listing the exact export it waits for.

**H. i18n keys (PR-K, DE first)**
22. New shard `native.json` in all 11 locales (top-level `native`), ≤ 10 keys: `native.unported.title`,
    `native.unported.body`, `native.adminInBrowser.title`, `native.adminInBrowser.body`, `native.configMissing.title`,
    `native.configMissing.body`, `native.a11y.unread` (`{count}`), `native.a11y.openNotifications` (`{count}`),
    `native.a11y.openCart` (`{count}`). DE written first (du-form), EN mirrored, the other 9 through the repo's
    translation workflow (`scripts/translate-keys.mjs`) and the LLM audit, `_pending_review` until reviewed. All other
    shell strings reuse existing keys (F10, F13, F18, F21). `npm run i18n:inventory` is run; no screen changes, so
    `SCREEN_INVENTORY.md` is expected unchanged.
23. `docs/validation/<VTID>/staging-tests.json` + one read-only Playwright spec on the staging build (390×844,
    signed out, no write):
    - **the new shard shipped:** in `de` and in `ar`, the loaded i18n bundle contains a parseable `native` namespace
      with exactly the expected key count (read from the app's catalog in the page, or from the deployed shard chunk
      the page loads — whichever the implementation finds stable; the spec fails if neither is reachable);
    - **RTL unchanged:** `html[dir]` is `rtl` for `ar` and `ltr` for `de` on `/maxina`;
    - the community-app smoke suite runs as always.

**I. Parity ledger**
24. Route rows moved to `in_progress`, `owner: "N3 <VTID>"`: `AUTH.MAXINA_PORTAL` (`/maxina`), `AUTH.ALKALMA_PORTAL`
    (`/alkalma`), `/reset-password`, `/logout`, `/oauth/complete`. The public-auth lane takes them to `native`.
    `native_only`: `/` (reason updated) and `/*` (change 14).
25. `parity-ledger.mjs` gains a validated `shell` section (rows are not web destinations, so they cannot be
    `rows`): `{ key, web_source, native_source, status, exception, owner, last_parity_check }` for `MobileAppShell`,
    `TopAppBar`, `BottomNav:community`, `BottomNav:patient`, `BottomNav:professional`, `BottomNav:business-org_admin`,
    `BottomNav:business-staff`, `BottomNav:business-professional`, `SideDrawer:community`, `SideDrawer:role`,
    `SideDrawer:business`, `RoleSwitcherSheet`, `MobileModePill`, `PublicShell`, `LanguageSheet`. `--check` fails on
    (g) a `web_source` file that no longer exists, (h) `native|in_progress` without an existing `native_source`,
    (e) exception/web_fallback without a reason. `--report` prints the shell table. The ledger `version` goes from
    1 to **2** when the `shell` section is added; the script accepts versions 1 and 2 (a version-1 ledger simply has
    no shell section) and rejects anything else. N3 sets them `in_progress`;
    `native` only after the G1 checklist (program §4) passes on both platforms.

## Interfaces
**Consumed from N1 (`@vitana/core`, `@vitana/tokens`) — `apps/mobile/src/ports/core.ts`, `ports/tokens.ts`**
- I-N1.1 `@vitana/core/supabase` `createSupabaseClient({ url, publishableKey, dataApiUrl?, storage })` and
  `@vitana/core/storage` `KeyValueStorage`, `createMemoryStorage`; values from `env.ts` `endpoints(config)`.
  **Request to N1 (additive):** an optional `auth?: { flowType?: 'pkce' | 'implicit' }` option passed through to
  supabase-js, needed for the Android Apple PKCE flow. **Stub:** supabase-js `createClient` with the same option set.
- I-N1.2 `@vitana/core/gateway` `createGatewayFetch({ origin, getAccessToken, fetchImpl })`, `gatewayJson`,
  `GatewayError`; `@vitana/core/config` `gatewayApiUrl(origin)`. **Stub:** a `fetch` wrapper with the same signature.
- I-N1.3 Shell data and rules: exactly the names listed in change 2 (`/nav`, `/business-mode`, `/roles`, `/tenants`,
  `/language`, `/registry`). **Stub:** `src/ports/core.stub.ts`, branch-only, removed before merge (change 2).
- I-N1.4 `@vitana/tokens`: `colors`/`resolved` for light and dark, `themeVars(scheme, brand?)`, `radius`, `fonts`,
  `gradients` (Maxina top bar); the brand overlay from `@vitana/core/tenants` `tenantBrand(slug)`. **Stub:** a
  hand-written table for the shell's colours, branch-only, with the same removal rule.

**Consumed from N2 (UI kit) — `apps/mobile/src/ports/ui.tsx`**
- I-N2 `Text`, `PressableRow`, `IconButton`, `Icon({ name, size, color })` (lucide name), `Avatar`, `CountBadge`
  (`NotificationBadge` semantics, 99+), `TextInput`, `Spinner`, `DelayedLoader`, `BottomSheet({ open, onClose,
  title, children })` (`ResponsivePopover`/`Sheet` on mobile), `SideSheet({ open, side: 'start', onClose })`,
  `RadioGroup`, `Toast`/`notify`/`notifyError` (keys, not strings). **Stub:** RN `Text`/`Pressable`/`Modal`
  implementations; `Icon` renders a sized `View` with `testID="icon-<name>"`.

**Provided by N3 to N4 / N6 / screen lanes**
- I-SH.1 `useAuth()` `{ session, user, loading, signOut }`, `getAccessToken()`; `useTenant()`, `useRole()`,
  `useBusinessMode()`, `useI18n()` (incl. `language`, `rtl`), `useThemeMode()`.
- I-SH.2 `resolveWebPath(url)`, `navigateToWebPath(url)`, `overlayBus.emit|on(event, detail)`.
- I-SH.3 Badges: `registerBadgeSource('inboxUnread'|'notificationsUnread'|'cartCount', useHook)`; stub 0.
- I-N6 ORB slot: `registerOrbSlot(Component: ComponentType<{ bottomNavVisible: boolean; hiddenBySheet: boolean }>)`;
  until registered, a placeholder of the same footprint (`accessibilityElementsHidden`). N6 owns the FAB.
- I-N4 consumed from N4: `appLink(path): string` (app link / scheme URL for `/oauth/complete` and e-mail
  redirects). **Stub:** `Linking.createURL(path)` from `expo-linking` (already a dependency, F1).

## Tests
- **jest-expo + RNTL (`apps/mobile/tests/`), no network:** global `fetch` mocked to throw; `@supabase/supabase-js`
  `createClient` mocked with an in-memory auth/RPC double; `expo-secure-store`, `expo-apple-authentication`,
  `@react-native-google-signin/google-signin`, `expo-web-browser`, AsyncStorage mocked.
  - `env.test.ts` (extended): production anon key (legacy JWT `ref`) refused; publishable key accepted only with a
    non-production URL; `authRedirectUrl`/`webBaseUrl` production and staging hosts refused; unset → `ConfigMissing`,
    never a fallback; no URL literal in `src/` outside the blocked-host list.
  - `secure-storage.test.ts`: chunk round-trip at 1, 1,800, 1,801 and 10,000 bytes; removal deletes all chunks; a
    throwing SecureStore reads as signed out.
  - `auth.test.tsx`: password sign-in/up call shapes (incl. `data.tenant_slug`, `emailRedirectTo` from config);
    Apple iOS passes hashed nonce to Apple and raw nonce to `signInWithIdToken`; Google passes the id token; Android
    Apple runs PKCE and `exchangeCodeForSession`; post-sign-in `switch_to_tenant_by_slug('maxina'|'alkalma')` +
    `refreshSession` and navigation to `/onboarding/welcome?redirectTo=`; `signOut` uses `scope: 'local'` and clears
    query cache, org id and tenant slug; loading resolves within the pinned timeout when `getSession` hangs.
  - `identity.test.tsx`: `set_role_preference` optimistic + rollback; `get_my_permitted_roles` fallback to
    `list_roles_for_active_tenant`; `computeAvailableRoles` never lists backoffice/developer/infra; staff/admin switch
    opens the `adminInBrowser` sheet when `webBaseUrl` is unset; business entry switches without any role RPC.
  - `secure-storage.test.ts` (race cases): a `getItem` interleaved with a `setItem` (fake SecureStore that yields
    between chunk writes) never returns a mixed session — it returns the old or the new value; a version change
    mid-read retries and gives up as `null` after 3 tries; concurrent `setItem` calls are serialised (final value is
    the last write); a shorter write leaves no stale chunk.
  - `language.test.tsx`: a language change with a matching `tts_voice` writes only `stt_language`; with a
    non-matching one writes `stt_language` + `tts_voice: null` in one update; signed out writes nothing remote.
  - `shell-logic.test.ts`: a business-mode case (org_admin, staff, professional) asserts the drawer rows contain no
    `commerce`, no `health-orders`, exactly one logout as the last row after the switch row, and `patient-results`
    only when the member qualifies; a role-mode case asserts `CROSS_MODE_IDS` rows minus routes the role nav lists.
    Plus table tests ported from the web cases (`MobileBottomNav.role.test.ts`,
    `business-modes.test.ts`, `SideDrawerNav.*.test.ts`, `role-switch-destination.test.ts`, `useRoleSwitch.test.ts`)
    — same inputs, same expected rows/items/destinations; wallet row hidden on iOS only.
  - `shell.test.tsx` (expo-router `renderRouter`): community/patient/professional/three business bars render the
    expected items in order with the ORB slot in the centre; bars hidden on `/maxina`, `/comm/live-rooms/x`,
    `/news/1`, role sections without a mode bar; drawer opens from kebab and from an edge-swipe gesture; row tap
    navigates; LIVE hidden in live rooms; tenant name uppercased per tenant; mode pill selects nested values.
  - `navigation.test.ts`: **every** `screens.json` screen (`route` and `mobileRoute`, params filled with sample
    values), every `exclusions.json` path and every role route resolves to a native route or `unported` — never
    not-found — and the query string survives (`/settings?mode=billing.plan`); a random path resolves to not-found;
    a `renderRouter` pass over the same list proves Expo Router really lands on the resolver or the concrete route
    (static over catch-all).
  - `i18n-rtl.test.tsx`: all 11 locales render the shell without raw keys (fails on any `t()` that returns its key);
    `ar` sets `direction: 'rtl'` on the root and mirrors start/end; a language change writes `stt_language` once and
    flips direction without remount; no `left`/`right` style keys in `src/shell/**` (static scan).
  - `theme.test.tsx`: default `light`; `system` follows `Appearance`; Maxina vs Alkalma accent applied from
    `tenantBrand(slug)`.
  - `ports.test.ts`: shell/auth files import lane code only through `src/ports/*`; on `main` no `*.stub.ts` file
    under `src/ports/` is imported (the stub-removal rule of change 2).
- **node --test (`scripts/native/__tests__/`):** `check-shell-pins` fails on a changed AST text (with the file and
  declaration named) and passes on whitespace/comment-only edits; ledger `shell` section checks (g)/(h)/(e); a
  version-1 ledger without a shell section still passes, version 3 is rejected; existing ledger tests stay green.
- **Root unchanged:** PR-S touches no web file, so web Vitest/lint/build and STAGING-TESTS-REQUIRED skip ("no
  deploy path"). PR-K: web Vitest, lint, i18n checks, build, and its staging spec (change 23).
- **Maestro journeys (defined in `apps/mobile/maestro/shell/*.yaml`, run only on G1 with row 8b builds, never in
  CI):** email sign-in/out (synthetic G1 member); sign-up landing in `/onboarding/welcome` (G1 only); Apple (iOS
  device) and Google sign-in; Android Apple via browser; drawer via kebab and edge swipe; every community tab; role
  switch community → patient → community (G1 member with a patient grant); business mode for org_admin/staff/
  professional (G1 org fixtures); Maxina vs Alkalma member; language → `ar` (RTL screenshots) → `de`; dark mode;
  push-free deep link to an unported destination; staff → admin console sheet. Each journey takes iOS and Android
  screenshots for the program §4 visual-parity review against web staging 390×844 (read-only).

## Rollout / gates
1. Spar this plan (same partner, ≥ 2 passes), then Gate 1. Allocate the VTID citing the sparring record; create
   `scope.json`.
2. **PR-K first** (keys exist before code uses them): local checks, push, PR, ready when green, merge → staging deploy
   → STAGING-VERIFY → **Gate 2** "Staging verified — ready for deployment to production?" with the evidence. PR-S
   does not wait for production: it reads keys from the repo, not from production.
3. **PR-S:** built on a branch against the stubs while N1 is in review; **merged only after N1 has merged**, with the
   port switched to `@vitana/core` and the stubs deleted in PR-S itself. Order B → C → D → A(2–4) → E → F → G → I. Local checks (`npm ci --prefix apps/mobile`, typecheck, test,
   bundle for iOS and Android, `node --test scripts/native/__tests__/`, `parity-ledger.mjs --check`). Merge with green
   checks; nothing deploys, no Gate 2.
4. **G1–G3 not passed:** code + unit tests + JS bundles proceed now. The device/data exit (Maestro on both platforms
   against G1) waits for G1 (row 5) and row 8b; Apple on a device also waits for G3. Ledger rows stay
   `in_progress` until then. Owner decisions from program §8 are used with the planner defaults: Expo (1), `.dev`
   ids until G3 (2), admin in the system browser (3), today's iOS wallet hiding (4), G1 funded (8).
5. Rollback: revert PR-S (app-only). PR-K is additive keys; revert is safe because nothing on the web reads them.

## Out of scope (with the owner of each)
- Screen bodies behind the tabs and drawer rows, mode configs per screen, the portal's visual extras, onboarding,
  `/auth/confirmed`-style landings: Wave 2 lanes (public-auth lane for the auth screens).
- Push, universal links / App Links, `apple-app-site-association`/`assetlinks.json`, app-config endpoint, link scheme
  choice: N4. ORB FAB, voice, navigation directives: N6. Health Sync: N5. Primitives: N2. Core/tokens extraction and
  moving any `src/` module: N1.
- Global overlays' content (Autopilot, Wallet, Vitana Index, Invite, Notifications panel): their lanes register on the
  overlay bus.
- Exafy-admin tenant switching (`set_active_tenant`), admin/BackOffice/developer consoles (system browser /
  excluded), the DB brand pack (VTID-05150 consumers), StoreKit/Play Billing, account deletion + Apple token
  revocation (`/delete-account`, profile lane, store requirement), React Query persistence to MMKV (N1 decision).
- Any production configuration: no production Supabase/Apple/Google setup, no store identifiers.
- A What's New entry (not a finished member feature).
- A native Spotlight screen manifest: native screens live outside `src/`, so they are not in the web
  `screen-manifest.json`; the native equivalent is the program §4 visual-parity method used by the Wave 2 lanes.

<!-- plan:end -->

### Open questions (planner defaults in bold)
1. **Moving the inline web shell rules into pure web modules** (`composeDrawerRows`, bottom-bar items/hide rules,
   `routeGuard`) would remove the native ports and their pins, but it edits pinned web components and the
   source-text tests that read them. **Default: not in N3; offered as a follow-up web extraction (own PR, web
   deploy path, own staging suite) after which N1's extractor exports them; until then the pins keep the copies
   honest.**
2. **Bottom bar as a stack, not a tab navigator.** A tab navigator would keep each tab's scroll/state (a native
   improvement) but differs from the web, which remounts on every tab tap. **Default: stack + custom bar (parity);
   revisit in Wave 3 beta feedback.**
3. **Alkalma social sign-up.** `signInWithIdToken` cannot carry `tenant_slug`, so a brand-new Apple/Google member from
   the Alkalma portal is first enrolled in maxina (default tenant, F23) and then joins alkalma via
   `switch_to_tenant_by_slug` — two memberships where the web makes one. Maxina is unaffected. **Default: build it,
   verify the exact rows on G1 (read-only queries), and if confirmed raise a platform follow-up (e.g. an RPC that sets
   the signup tenant for a just-created user) instead of a client workaround.**
4. **Google nonce.** If the pinned `google-signin` version cannot pass a nonce, Supabase needs "skip nonce check" for
   Google on the test project. **Default: use the nonce-capable API; enable skip-nonce on G1 only if the SDK forces it,
   recorded in the G1 config notes; never touch production auth settings.**
5. **Drawer side and edge swipe in `ar`.** The web keeps `x < 30` from the left edge regardless of direction
   (`MobileAppShell.tsx:43`). **Default: mirror what the web actually renders in `ar` (checked by a read-only staging
   screenshot before implementation); if the web drawer opens from the left in RTL, native does the same and the
   difference to platform RTL conventions is recorded as a parity note, not fixed in N3.**
6. **Google OAuth clients for G1** (iOS, Android, web client ids) must live in a Google Cloud project Exafy owns; no
   billing or Google API calls are involved (identity only), but this is a GCP touch point. **Default: the owner names
   the project when G1 is set up; until then Google sign-in is built and unit-tested and its Maestro journey is
   skipped.**
7. **Android Apple sign-in.** Apple has no Android SDK. **Default: browser PKCE flow (keeps the web's Apple button on
   Android); the alternative is hiding Apple on Android, which deviates from the web.**

## Planner responses — round 1
- **CROSS-LANE (coordinator decision) ACCEPTED.** `gen-shell-source.mjs` and its generated file are dropped. N3
  consumes `@vitana/core/{nav,business-mode,roles,tenants,language,registry,supabase,gateway,config,storage}` with
  the exact names from N1's Interfaces table (change 2, I-N1.1–I-N1.4). A branch-only stub stands in until N1
  merges, and PR-S merges only after N1, with the stubs deleted (Meta merge order, Rollout 3, `ports.test.ts`). The
  production-key check and `supabasePublishableKey` are N1's `env.ts` change, so N3 removed its own. Inline
  component logic (drawer row composition, hide rule, route guard, `getInstantTenantName`, `findActiveLabel`) stays as
  N3's ports, checked by `check-shell-pins.mjs`, which only checks and generates nothing. One additive request to
  N1: an optional `auth.flowType` passthrough in `createSupabaseClient` for PKCE (I-N1.1).
- **F1 [major] ACCEPTED.** Change 8: the chunks are written `.n…0` first, `.count` last, then a `.version` bump.
  `removeItem` bumps the version, then deletes `.count` before the chunks. Reads check the version before and after
  assembly and retry at most 3 times before returning `null`. One in-process async mutex serialises set/remove.
  Stale chunks are cleaned up. New race tests are in Tests.
- **F2 [major] ACCEPTED.** Change 3 names the two filters: the hardcoded `['patient-results','support','settings']`
  in business mode (`SideDrawerNav.tsx:284-285`) and `CROSS_MODE_IDS` in the role branch (`:308-309`). A business-mode
  test asserts that no `commerce` or `health-orders` row appears and that logout is the single last row.
- **F3 [minor] ACCEPTED.** Change 23 now checks that the `native` namespace is present and parseable in the deployed
  i18n bundle with the expected key count. The RTL `dir` check is kept.
- **F4 [minor] ACCEPTED.** Change 10: the primary tenant stays maxina for ID-token sign-ups. A brief maxina reflection
  is possible for Alkalma until the switch completes, so the loader is held until then. The G1 journey watches for a
  maxina flash and raises the Open question 3 follow-up as a priority if it shows up.
- **F5 [minor] ACCEPTED.** Change 12 writes `tts_voice: null` together with `stt_language` when the stored voice does
  not match the new language (`LanguageContext.tsx:303-311`). New test `language.test.tsx`.
- **F6 [minor] ACCEPTED.** Change 25: the ledger version becomes 2 with the shell section. Version 1 is still
  accepted, any other version is rejected. Tested.
- **Q3 (Spotlight manifest):** native screens are outside `src/`, so they are not in `screen-manifest.json`. The
  Wave 2 visual-parity method is the native equivalent, and N3 adds no native manifest (recorded under Out of scope).
- **Follow-on from the CROSS-LANE decision.** Change 14's resolver route no longer implies its own web-destination
  manifest. It reads the destinations from `parity/ledger.json`, which `--check` keeps current. Guest paths are a hand
  list that `check-shell-pins.mjs` checks against App.tsx `allowGuest`. No second generator exists anywhere in N3.
