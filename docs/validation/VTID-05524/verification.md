# Verification — VTID-05524 (native-wave2-role-modes-r2 / business)

Native business / commerce-mode port: the 11 `role-modes` commerce ledger rows (10
`source: role-route` + the `source: exclusion` row `/commerce/connect/authorize`); 11 screens,
7 route files. The 4 public pages (`/commerce-login`, `/commerce/join`, `/commerce/connect`,
`/commerce/connect/privacy`) ship as exported screens; their `app/(public)/` route files are
outside this lane's paths and move to the `native-shell-fixes` lane, so their ledger rows stay
`not_started` with a note. Spec: `.kiro/specs/native-wave2-role-modes-r2/` in vitana-platform (plan PR #4635; read
from `origin/kiro/native-wave2-role-modes-r2/plan` while that PR is open). The plan block and
`tasks.md` `<!-- lane: business -->` govern.

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and
`apps/mobile/maestro/business/README.md`. Everything below ran offline; every write is asserted as
the built request against a mocked gateway / Supabase double and nothing reaches a network
(`tests/helpers/no-network`).

## What changed

| Area | Files |
|---|---|
| Routes | `app/(app)/commerce/{index,team}.tsx`, `health-orders/{index,inbox}.tsx`, `connections/[id].tsx` (redirect to `/commerce?connection=`), `invites/[token]/accept.tsx`, `connect/authorize.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + the 5 static paths. No `app/(public)/` file: the 4 public route files move to `native-shell-fixes` |
| Screens | `src/screens/business/` — `CommercePortalScreen`, `CommerceTeamScreen`, `CommerceHealthOrdersScreen`, `CommerceAcceptInviteScreen`, `CommerceConnectAuthorizeScreen` (+ the Community consent), `CommerceJoinScreen`, `CommerceConnectDocsScreen` (+ privacy), `CommercePortalLoginScreen`; `components/` — every web commerce component the phone renders (AgentConnectCard, McpConnectPanel, CommerceGuestLanding + "What happens next", MyOrgCard, ConnectionCard, ConnectionProgress, SetupHub + ProfileSheet + TermsRow, PartnerTermsSheet, SetupChooser, RegisterOrgDialog, AiSetupSheet, AddProductSheet, ProductForm + VerticalFieldInput + ListingStrength + ProductImageField, SalesSetupSheet, CatalogueImportSheet, ManualConnectDialog, ConnectionWorkbench, PartnerOrgRoster, BusinessContext) |
| Data | `data/client.ts` (the web `adminFetch` / `gatewayCall` / `fetchMcpReady` natively: same paths, headers incl. `X-Vitana-Tenant`, same error messages), `data/hooks.ts` (class-B web hooks re-implemented: `usePartnerHealthOrders` family, `useOrgMembers` family, `useCommerceVerticals`, the membership query), `data/consent.ts` (Supabase OAuth 2.1 consent + the two `ai_connection_*` RPCs), `data/external.ts` (hosted-page return leg) |
| Core | `packages/core/extract.json` — 7 new entries (`commerce-host`, `-ai-setup`, `-register`, `-catalogue`, `-suggestions`, `-mcp`, `-data`): only IO-free declarations copied verbatim, `packages/core/src/commerce.ts` re-exports them; `gen-core-extract` + `core-closure --write` run, `scripts/native/mobile-ci-paths.generated.json` regenerated |
| Ports | `src/ports/commerce.ts` (`@vitana/core/commerce`), `src/ports/business-ui.tsx` (kit re-exports, lucide glyphs, entrance fade + breathing halo with reduced motion, share sheet, photo library, document picker, in-app browser) |
| i18n | `src/i18n/*/businessNative.json` — 1 key (photo permission denied), DE first (du-form), all 11 locales; all other strings reuse the web's `screens.commerceportal.*`, `commerceConnect.*`, `screens.commerceconnect.*`, `aiConnect.*`, `screens.admin.*`, `toasts.admin.*`, `screens.partnerportal.*`, `screens.portals.*`, `common.*` keys |
| Ledger | `apps/mobile/parity/ledger.json` — 7 rows `not_started` → `native` (owner kiro, 2026-11-03); the exclusion row's `scope` stays `in`; the 4 public rows stay `not_started` with an `exception` note pointing to `native-shell-fixes` (route file not mounted) |
| Tests | `apps/mobile/tests/business/**` (9 suites, new); no shared test changed |

No shell / identity / ORB / web file changed, no backend, no migration.

## Task 1 (core extraction) — what main already had

`src/lib/role-switch-destination.ts` is already in `@vitana/core` on main: `extract.json`
entry `roles` copies `getRoleSwitchDestination` / `isExternalRoleSwitchDestination` verbatim
(with a `getCommandHubUrl` stub) and `src/identity/useRoleSwitch.ts` already uses it after a role
switch. A `manifest.json` re-export (the plan's wording) is not possible: the module imports
`getCommandHubUrl` from `src/config/devHub.config.ts`, which reads `import.meta.env`, so
`core-closure --check` classes it B. The lane's new class-A extraction is therefore the commerce
rules the screens reuse (above), generated and committed with `--write` in this PR; the
role-switch helper has its unit test here (`tests/business/routes.test.tsx`). No data hook went
into core.

## Parity notes (mobile-web branch, 1:1)

- `/commerce` renders what CommercePortal renders below `lg:`; the `hidden lg:block` block
  (agent card, manual card, connections list) is not rendered, exactly like the phone web. The
  connections list is still loaded (the web does too) and reloaded after a connect.
- Hero CTA order and weight follow the web's three cases (MCP live → MCP first; AI setup on →
  AI first; else register first and primary without a business). "Connect via AI Agent" opens
  the agent card in a dialog (the web's below-`lg:` branch).
- First visit with no business opens MCP / AI setup / register by itself once per app session
  (the web's sessionStorage key).
- The business bottom tabs, drawer and role switch are the shell's (`resolveBusinessBottomNav`,
  `businessDrawerItems`, `getRoleSwitchDestination` from `@vitana/core`); the lane's routes are
  business routes, so the bar shows on them (tested).
- `/commerce/health-orders`: a failed list reads as "no orders yet", as on the web (no separate
  error panel added).
- iOS IAP: no purchase surface in this cluster ("Sell directly on Vitanaland" is the web's disabled
  "coming soon" row); the shell's `iapRestricted` gates are untouched.

## Documented native differences

- Copy (MCP address, agent card): the app ships no clipboard module, so Copy opens the system
  share sheet (which carries Copy) and the address is selectable text — the web's own fallback
  when the clipboard is blocked. The roster's "Share invite" is the share sheet as on the phone
  web; the web's silent clipboard copy right after sending an invite has no native twin (the
  link is on the invite card with Share).
- CSV template: shared as a file through the share sheet (the web downloads it). CSV / OpenAPI
  files come from the system document picker (expo-file-system, part of the Expo SDK the app
  already ships).
- Shopify / SMART-on-FHIR authorize opens in the in-app browser; on return (closed, AppState
  active or focus) the connection is re-read, then 4 more times every 3 s (`data/external.ts`).
- The AI assistant's consent redirect is handed to the OS (`Linking.openURL`).
- "Talk to Vitana" (voice AI setup) is shown on the web only when the orb widget can start a
  commerce setup; the native ORB ignores `commerce_setup_*` (N6e, `src/orb/protocol.ts`), so the
  button is not shown. The portal and sheet still listen for `vitana:commerce-setup-*` on the
  native overlay bus.
- Animations: framer-motion fades → `FadeIn` (opacity + 14 px, 0.5 s), `whileInView` → on mount;
  the agent card's breathing halo is kept; both off under reduced motion.
- Dates use the member's app language (`fmtDate` / `fmtDateTime`); country names come from
  `Intl.DisplayNames` (the ISO code where the engine has none, the web's own catch branch).

## UX acceptance (Commerce UX contract, vitana-v1 CLAUDE.md)

- **User steps:** unchanged from the web for every flow (register: offer → name / website /
  country → done; AI setup: website → review → create; add product: kind → vertical → form;
  CSV: choose file → check → import; join: provider or e-mail).
- **Required fields:** the web's, no new field. **Decisions:** the web's, no new dialog, step or status.
- **Anything asked that Vitanaland or the AI could infer:** none added (company suggestions
  prefill country / website exactly as on the web; the short name is still derived).
- **Can the user always tell what to do next:** yes — same single dominant action per screen.
- **Friction vs. before:** the same as the mobile web inside the app, with one exception owned
  by the shell (see "Shell follow-up" below).

## Shell follow-up (fix-forward plan native-shell-fixes)

Driver decision (2026-11-03): both are real shell bugs, outside this lane's paths, and are NOT
fixed in this PR. They go into the shell fix-forward plan `native-shell-fixes`. Both add
friction compared with the web today.

1. **Signed-out `/commerce/*` deep link lands on the community sign-in.**
   - Native: `apps/mobile/src/shell/AuthGate.tsx:46` — every protected path a signed-out
     visitor opens (all but `GUEST_PATHS`) redirects to `/maxina?redirectTo=<path>`.
   - Web: `src/components/AuthGuard.tsx:65` — `if (window.location.pathname.startsWith('/commerce'))
     return '/commerce/join';`, used at `AuthGuard.tsx:204`
     (`navigate(`${loginRoute}?redirectTo=…`)`) (VTID-03894).
   - User impact: a signed-out supplier who opens an org invite
     (`/commerce/invites/:token/accept`), an AI-assistant consent
     (`/commerce/connect/authorize?authorization_id=`), `/commerce/team` or
     `/commerce/health-orders` on the phone sees the Maxina community sign-in instead of the
     supplier front door (`/commerce/join`: Google / Apple / e-mail, supplier wording). They can
     still sign in there and come back to the page, but it is the wrong product's sign-in — the
     exact problem VTID-03894 fixed on the web.
2. **Doubled `/api/v1` in the shell's gateway reads.**
   - Native: `apps/mobile/src/identity/useMyPartnerOrgs.ts:23` —
     `gatewayGet('/api/v1/partner-orgs/mine')`, and
     `apps/mobile/src/identity/GuidedModeProvider.tsx:71` — `gatewayGet('/api/v1/journey/state')`.
     The gateway fetch already appends `/api/v1` to the origin
     (`packages/core/src/config.ts:24` `gatewayApiUrl`, used at `packages/core/src/gateway.ts:22`),
     so on a device the requests go to `/api/v1/api/v1/partner-orgs/mine` and
     `/api/v1/api/v1/journey/state`.
   - Web: `src/hooks/useOrgMembers.ts:87` — `adminFetch(`${PARTNER_ORGS_API}/mine`)` with
     `PARTNER_ORGS_API = '/api/v1/partner-orgs'` (`src/lib/commerce-host.ts:28`) on a base that has
     `/api/v1` stripped (`src/lib/admin-api.ts:29`) → one `/api/v1`; journey state:
     `src/context/GuidedModeProvider.tsx:160` `communityFetch('/api/v1/journey/state')`.
   - User impact: on a device the membership query 404s, so a business member gets no business
     entries in the role switcher, no business bottom bar and no business drawer section — they
     cannot enter business mode from the shell (the commerce screens themselves still work, and
     `/commerce/team` / health orders are reachable through the portal). The guided-mode journey
     state never loads (guided mode falls back to its default). The shell tests' fake
     (`apps/mobile/tests/helpers/providers.tsx:24`) is installed as the raw gateway fetch and
     matches the literal path, which hides the bug.

**This lane's tests do not depend on either bug.** The business screens use their own
membership query (`src/screens/business/data/hooks.ts` `useCommerceOrgs` →
`/partner-orgs/mine`, no double prefix) and never render the shell; the lane's gateway fake sits
under N1's real `createGatewayFetch` and strips `/api/v1` exactly once
(`tests/business/helpers.tsx`), so a doubled prefix would 404 there. No lane test fakes
`useMyPartnerOrgs` or renders `AuthGate`; `tests/business/routes.test.tsx` checks the business
bottom bar through the pure `resolveBottomNav` / `shouldHideBottomNav`, not the shell query.

## Red → green

`red-on-base.txt`: the lane's tests on a clean `origin/main` (dc8233663) — 8 suites fail with the
screen modules missing, `routes.test.tsx` fails on the route files, resolutions and ledger rows.
On the branch all pass (`commands.log`).
