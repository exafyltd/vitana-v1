# Verification — VTID-05524 (native-wave2-role-modes-r2 / business)

Native business / commerce-mode port: the 11 `role-modes` commerce ledger rows (10
`source: role-route` + the `source: exclusion` row `/commerce/connect/authorize`), 11 route
files. Spec: `.kiro/specs/native-wave2-role-modes-r2/` in vitana-platform (plan PR #4635; read
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
| Routes | `app/(app)/commerce/{index,team}.tsx`, `health-orders/{index,inbox}.tsx`, `connections/[id].tsx` (redirect to `/commerce?connection=`), `invites/[token]/accept.tsx`, `connect/authorize.tsx`; `app/(public)/commerce/{join,connect/index,connect/privacy}.tsx`, `app/(public)/commerce-login.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + the 9 static paths |
| Screens | `src/screens/business/` — `CommercePortalScreen`, `CommerceTeamScreen`, `CommerceHealthOrdersScreen`, `CommerceAcceptInviteScreen`, `CommerceConnectAuthorizeScreen` (+ the Community consent), `CommerceJoinScreen`, `CommerceConnectDocsScreen` (+ privacy), `CommercePortalLoginScreen`; `components/` — every web commerce component the phone renders (AgentConnectCard, McpConnectPanel, CommerceGuestLanding + "What happens next", MyOrgCard, ConnectionCard, ConnectionProgress, SetupHub + ProfileSheet + TermsRow, PartnerTermsSheet, SetupChooser, RegisterOrgDialog, AiSetupSheet, AddProductSheet, ProductForm + VerticalFieldInput + ListingStrength + ProductImageField, SalesSetupSheet, CatalogueImportSheet, ManualConnectDialog, ConnectionWorkbench, PartnerOrgRoster, BusinessContext) |
| Data | `data/client.ts` (the web `adminFetch` / `gatewayCall` / `fetchMcpReady` natively: same paths, headers incl. `X-Vitana-Tenant`, same error messages), `data/hooks.ts` (class-B web hooks re-implemented: `usePartnerHealthOrders` family, `useOrgMembers` family, `useCommerceVerticals`, the membership query), `data/consent.ts` (Supabase OAuth 2.1 consent + the two `ai_connection_*` RPCs), `data/external.ts` (hosted-page return leg) |
| Core | `packages/core/extract.json` — 7 new entries (`commerce-host`, `-ai-setup`, `-register`, `-catalogue`, `-suggestions`, `-mcp`, `-data`): only IO-free declarations copied verbatim, `packages/core/src/commerce.ts` re-exports them; `gen-core-extract` + `core-closure --write` run, `scripts/native/mobile-ci-paths.generated.json` regenerated |
| Ports | `src/ports/commerce.ts` (`@vitana/core/commerce`), `src/ports/business-ui.tsx` (kit re-exports, lucide glyphs, entrance fade + breathing halo with reduced motion, share sheet, photo library, document picker, in-app browser) |
| i18n | `src/i18n/*/businessNative.json` — 1 key (photo permission denied), DE first (du-form), all 11 locales; all other strings reuse the web's `screens.commerceportal.*`, `commerceConnect.*`, `screens.commerceconnect.*`, `aiConnect.*`, `screens.admin.*`, `toasts.admin.*`, `screens.partnerportal.*`, `screens.portals.*`, `common.*` keys |
| Ledger | `apps/mobile/parity/ledger.json` — the 11 rows `not_started` → `native` (owner kiro, 2026-11-03); the exclusion row's `scope` stays `in` |
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
  by the shell (below).

## Open item for the owner (outside this lane's paths)

- **Signed-out deep link to a protected `/commerce/*` page.** The web's AuthGuard sends a
  signed-out visitor on any `/commerce` path to `/commerce/join?redirectTo=<path>` (VTID-03894);
  the native shell's `src/shell/AuthGate.tsx` sends every protected path to
  `/maxina?redirectTo=<path>` (the community sign-in). So a signed-out supplier who opens an org
  invite or an AI-assistant consent link on the phone meets the community sign-in, not the
  supplier front door. The fix is a one-line branch in `AuthGate.tsx` (shell, not in this lane's
  paths). Not changed here; reported for a decision.
- **Shell membership query path.** `src/identity/useMyPartnerOrgs.ts` and
  `GuidedModeProvider.tsx` call `gatewayGet('/api/v1/…')`, but the native gateway fetch already
  prepends `/api/v1` (`gatewayApiUrl`), so on a device the request goes to
  `/api/v1/api/v1/partner-orgs/mine`. The shell tests' gateway fake accepts both forms, which
  hides it. Effect: the shell's business modes (switcher entries, business bottom bar, business
  drawer) would not appear on a device. This lane's screens use their own correct call
  (`/partner-orgs/mine`); the shell file is outside the lane's paths. Reported for a decision.

## Red → green

`red-on-base.txt`: the lane's tests on a clean `origin/main` (dc8233663) — 8 suites fail with the
screen modules missing, `routes.test.tsx` fails on the route files, resolutions and ledger rows.
On the branch all pass (`commands.log`).
