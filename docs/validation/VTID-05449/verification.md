# Verification — VTID-05449 (native-wave2-public-auth-onboarding-r3 / auth-portals)

Native Wave 2 auth lane: the portals, OAuth, reset, confirm and logout ports. All commands
run offline (the native app has no production profile; `assertNotProduction()` refuses
prod/staging hosts). Sign-in is the one auth write and runs only against the fake Supabase
double. Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-public-auth-onboarding-r3-auth-portals`,
base `origin/main` ec8682fec. Every command and its counts: `commands.log`.

## What was built

- `/maxina` — `PortalScreen` (N3's functional sign-in / sign-up) inside the mobile-web
  chrome of `MaxinaPortal.tsx` (`PortalChrome.tsx`): the backdrop overlay layers, the
  translucent card, the footer ("part of the VITANA ecosystem", Privacy · Terms · Help),
  the Orb discovery hint (enter / hold / exit / gap cycle, tap opens the ORB), the
  `?diag=1` badge and the `?confirmed=true` toast.
- `/alkalma` and `/:tenantSlug` — `TenantPortalScreen`, twin of `TenantPortal.tsx` +
  `TenantAuthCard.tsx`: slug checks (malformed → not found, retired → successor, a path the
  web routes statically → the resolver), `resolve_tenant` (loading / error + Retry / unknown
  → not found), hero, sign-in / join tabs, sign-up only for `open_signup`, OAuth only with
  `landing.oauth`, check-email + resend (60 s / 120 s cooldown), signed-in member switch →
  `portalLandingTarget`, non-member Join or invite-only.
- `/auth/confirmed`, `/maxina/confirmed`, `/alkalma/confirmed` — `ConfirmedScreen`
  (`EmailConfirmed` / `MaxinaConfirmed` / `AlkalmaConfirmed`): loading, error (cancelled /
  expired / other / not signed in) with the way back, the confirmed card with Continue and
  the 3 s (Maxina 5 s) auto-redirect to the role landing; Maxina's welcome discount; the
  portal variants switch tenant on mount.
- `/oauth/complete` — processing, error (gateway `?error=`, missing / refused code, 10 s
  deadline) with "Go back and try again" / "Return to Vitana"; success → `postSignInTarget`.
- `/oauth/consent` (AuthGate) — `OAuthConsentScreen`, twin of `OAuthConsent.tsx`: invalid
  request, scopes pre-ticked, untick, Allow / Deny decision to the MCP AS, client redirect.
- `/reset-password` — the mobile-web card (badges, disabled request until an email is
  typed, ≥ 6 characters + equal, inline mismatch, show / hide password, "Update password").
- `/logout` — the spinner + "Signing out..." while the N3 sign-out runs.
- Seam reused, not reinvented: `resolve-link` → `link-router` → `auth-port` →
  `link-bridge`; `src/auth/sign-in.ts` stays the one auth-write path (extended:
  any-tenant confirmation link, `resendConfirmation`); `postSignInTarget` →
  `/onboarding/welcome` unchanged for the onboarding lane. `link-bridge` now opens
  `/auth/confirmed` (or its `?error=` state) for a confirmation link.
- Core: three pure tenant routing functions extracted verbatim into `@vitana/core`
  (`packages/core/extract.json` → `tenants.generated.ts`); no manifest / closure change.
- `src/ports/auth.tsx` — the lane's port (kit Checkbox / notify / withAlpha, token colours,
  lucide icons). `src/navigation/resolve.ts` — the four new concrete routes and
  `isStaticDestination`. Ledger: the 10 rows → `native`.
- `src/i18n/*/authPortalsNative.json` — 14 new keys (DE first, du-form; pt você; fr tu;
  ru ты), all 11 locales. Every other string reuses existing web keys.

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/auth --ci` → PASS, 4 suites / 217 tests.
- `npm test -- --ci` → PASS, 84 suites / 2374 tests, 57 snapshots.
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS (up to date).
- `npm run parity:check` → PASS (435 rows, 35 native routes); `--sync` → no change.
- `core-closure --check`, `gen-core-extract --check`, `gen-tokens --check`,
  `check-shell-pins`, `node --test scripts/native/__tests__` → all up to date / pass.
- i18n (repo root, `i18n-check.yml`): register, long words, subscriptions, stamp-source,
  locale registry, locale chunking (after `npm run build`), audit report-only (0 errors in
  `authPortalsNative`) → pass.
- Red → green: `red-on-base.txt` (all 4 suites fail on origin/main).
- Preflight: every check passed (`commands.log`).

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`),
including the real OAuth browser round-trip (Apple-on-Android PKCE, Apple / Google native
SDK consent — providers only on the G1 test project).

## Deviations from the web (each also in the file header)

- **Intro video**: the web plays a daily `/videos/intro/maxina/*.mp4` from its own host.
  The native app ships no video player (`expo-video` would be a new dependency in
  `apps/mobile/package.json` / `app.config.ts`, outside this lane's paths) and has no web
  host for the files; the backdrop's overlay layers are drawn over the page background
  without the video. Follow-up: a lane that owns the dependency.
- **Events teaser**: today's `MaxinaPortal.tsx` renders no events teaser; it only prefetches
  the community events query before the post-sign-in redirect. Nothing visible to port; the
  prefetch belongs to the events lane's native query.
- **Diag badge**: shows native runtime facts (app version, platform + OS version) instead of
  the WebView's UA / Appilix bridge / bundle hash, which do not exist natively.
- **`/alkalma`** renders the generic tenant portal like the web (`App.tsx:878`);
  `PortalScreen`'s `alkalma` key set stays (N3 tests use it) but no route renders it.
- **`/:tenantSlug` ranking**: Expo Router ranks the one-segment file above the resolver,
  so a path the web routes statically renders the resolver (same AuthGate + shell)
  instead of a portal; tenants come from `resolve_tenant` like the web.
- **OAuth complete**: the web's success panel (system browser → app deep link) has no
  native counterpart; success goes straight to `postSignInTarget` (N3 behaviour).
- **OAuth consent**: the AS URL has no default (`EXPO_PUBLIC_MCP_AS_URL`; unset →
  ConfigMissing `mcpAsUrl`; any `vitanaland.com` host refused). The client redirect opens
  through the system URL handler.
- **Tenant portal OAuth**: the native SDK sign-in stays on the portal (the web's OAuth
  redirect goes to `/home`), so the member / join states apply after it.
- **Required fields**: the web form's `required` / `minLength` become a disabled submit on
  the tenant portal. N3's Maxina `PortalScreen` form is unchanged (its tests submit with
  partial fields).
- **Copy**: `useEmailConfirmation.ts`'s English error sentences, the Alkalma page's
  hardcoded Arabic and the reset button's hardcoded "Update password" are catalog keys
  (`authPortalsNative.*`); the Alkalma success card reads its keys in `ar` so every member
  sees the Arabic page, as on the web. Errors stay inline (N3) where the web toasts.
