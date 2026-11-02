# Verification — VTID-05431 (native-wave2-profile-settings-r2 / settings)

Native settings hub port: `/settings` (the `MobileSettings` `?mode=` screen, 14 ledger rows),
`/settings/preferences?section=` (redirect + hub fallback), `/settings/limitations` and
`/settings/tenant-role` — 17 parity rows, 4 route files. Spec on vitana-platform `main`:
`.kiro/specs/native-wave2-profile-settings-r2/` (plan block + `tasks.md` `<!-- lane: settings -->` govern).

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and `apps/mobile/maestro/settings/README.md`.
Everything below ran offline; every write is asserted as the built request against a mocked
gateway / Supabase double and nothing reaches a network (`tests/helpers/no-network`).

## What changed

| Area | Files |
|---|---|
| Routes | `apps/mobile/app/(app)/settings/{index,preferences,limitations,tenant-role}.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + the 4 paths |
| Screens | `src/screens/settings/SettingsScreen.tsx` (hub, mode pill, Delete-account entry, ORB `vitana:settings-navigate`), `sections/{Notifications,Privacy,Preferences,Billing}Section(s).tsx`, `LimitationsScreen.tsx`, `TenantRoleScreen.tsx`, `PreferencesRedirect.tsx`, `components.tsx`, `sections.ts`, `format.ts` |
| Data | `src/screens/settings/data/requests.ts` (pure request builders), `data/hooks.ts` (class-B web hooks re-implemented natively: same tables / RPCs / gateway paths / query keys) |
| Port | `src/ports/settings-ui.tsx` — `Switch`, `Separator`, `Select*`, `Label`, `notifySuccess` and the lucide glyphs, re-exported from the kit (screens never import `@vitana/ui`) |
| i18n | `src/i18n/*/settingsNative.json` — 77 keys, DE first (du-form), mirrored to ar en es fr pl pt ru sr tr zh; existing `screens.mobilesettings.*`, `screens.settings.*`, `billing.*`, `mailhub.*`, `notificationControls.*`, `toasts.*` keys reused |
| Ledger | `apps/mobile/parity/ledger.json` — the 17 settings rows `not_started` → `native` (owner kiro, 2026-11-01) |
| Tests | `apps/mobile/tests/settings/**` (new); `tests/navigation.test.tsx` and `tests/orb/nav-directive.test.ts` updated (below) |

No `@vitana/core` change (plan decision 2), no backend / gateway / migration, no web screen touched.

## Parity notes (mobile-web branch, 1:1)

- `?mode=` handling mirrors `MobileSettings.tsx`: valid sections only, unknown → `notifications`,
  bare `privacy` / `preferences` → first child, a later `?mode=` is honoured and cleared.
- `/settings/preferences?section=accessibility` → `/settings?mode=preferences.accessibility` →
  hub fallback `notifications`, exactly today's web behaviour (requirements R1.5); no new section.
- Billing (`MobileBillingView` + `SubscriptionStateCard` + `CreatorPaymentsSection`): **iOS IAP
  gates kept exactly as today** — the web shows this section on every platform with no
  `isIAPRestricted()` check (that gate hides only the wallet entry points; native `drawer.ts`
  `iapRestricted` is untouched). Portal / Stripe Connect links open in the system browser; a
  non-`https://connect.stripe.com/` onboarding/dashboard URL is never opened (web VTID-01230 check).
- `TenantRole.tsx` calls `useMemberships()` without a tenant id, so `roles` is always undefined on
  the web and the role switcher shows the "no role memberships" notice; the port keeps that 1:1
  (no redesign). Current role on the phone is the forced `community`; permissions use `dbRole`.

## Documented deviations / deferrals

- Not rendered: the web utility bar around the pill (search — its query is never read —,
  `VitanaIndexChip`, `AutopilotChip`/`AutopilotPopup`, `UniversalCalendarButton`; other lanes, same
  call as the home lane VTID-05297), `PushDiagnostics` (browser service worker / Appilix FCM —
  not applicable natively; native push is N4), the `SubNavigation` strip on limitations / tenant-role.
- ORB: `vitana:settings-navigate` is registered while the hub is mounted; `vitana:settings-toggle`
  is not, so the ORB honestly reports `native_overlay_not_ported` for voice toggles.
- Web defects not reproduced: limitations formats the product count as a number (web passes it
  to `fmtDateTime`); the tag chip uses a real no-break space (web catalog has a literal `&nbsp;`).
- Strings the web hard-codes in English or reads with a missing-key fallback (`settings.chat`,
  `consent.aiData.*`, TenantRole role names/descriptions/permissions, limitations labels, creator
  buttons, sample sessions) come from the new `settingsNative` catalog in all 11 locales.

## Shared tests changed (outside the lane paths — Lane scope flags them)

- `tests/navigation.test.tsx` "keeps the query string": `/settings?mode=billing.plan` was asserted
  `unported`; it is now `native` (same href). Exact expectation, not loosened.
- `tests/orb/nav-directive.test.ts`: the "owning screen is not native" case used `/settings` as its
  example. It keeps its coverage with an injected resolver reporting the screen unported, and a new
  case asserts the native path (push `/settings`, then emit `vitana:settings-navigate`).

## Red → green

`red-on-base.txt`: the lane's tests on a clean `origin/main` (a41e89a0d) — 3 settings suites fail
(modules missing), the 2 changed shared assertions fail. On the branch all pass (`commands.log`).
