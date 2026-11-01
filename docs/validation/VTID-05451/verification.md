# Verification — VTID-05451 (native-wave2-public-auth-onboarding-r3 / public-legal)

Native Wave 2 public-legal lane: the signed-out `PublicAppShell` branch — `/`, `/privacy`,
`/terms`, `/maxina_support`, `/i/:code`, `/apply`, `/_intro/:tenantSlug`. All commands run
offline (the native app has no production profile; `assertNotProduction()` refuses
prod/staging hosts). Linux, base `origin/main` ec8682fe. Every command and its counts:
`commands.log`.

## What was built

- `app/(public)/{index,privacy,terms,maxina_support,apply}.tsx`, `app/(public)/i/[code].tsx`,
  `app/(public)/_intro/[tenantSlug].tsx` — one route file per web path, each rendering its
  screen from `src/screens/public/`.
- `PublicLandingScreen.tsx` — `src/pages/Index.tsx` (ShareEntry fallback, App.tsx:818): VITANA
  wordmark, intro lines, the five portal cards (Maxina → `/_intro/maxina` keeping the query,
  AlKalma → `/alkalma`, Exafy Admin → `/exafy-admin`, Vitana DEV → `<gateway>/command-hub/` in
  the system browser or the web's "not configured" error toast, Commerce → `/commerce-login`),
  footer. A resolving session paints a loader; a signed-in member goes on to `/home`.
- `LegalScreens.tsx` + `legal.tsx` + `legal-content.ts` — `PrivacyPolicy.tsx` / `TermsOfUse.tsx`:
  header (back, title, DE/EN toggle = `LegalLocaleToggle`), the article as data with the same
  `screens.legal.*` keys and order; `?lang=de|en` pins the copy (`useScopedT`).
- `MaxinaSupportScreen.tsx` — `MaxinaSupport.tsx`: ruby "M" badge header, hero, five help
  categories, the single collapsible FAQ accordion, contact (mailto), useful links (`/privacy`,
  `/delete-account`, `/maxina`), footer.
- `InviteLandingScreen.tsx` + `invite.ts` — `InviteLanding.tsx`: the code comes from the link
  `resolve-link.ts` tagged `invite` and `auth-port.ts` delivered (`onInviteLink`), or the route
  param on in-app navigation; it is kept (web `rememberInviteCode` rules: `^[a-z0-9]{6,16}$`,
  14 days) and the friend lands on `/maxina?tab=signup`. No request; the claim after sign-in is
  not in this lane.
- `ApplyScreen.tsx` + `apply-form.ts` — `Apply.tsx`: German by default with the route-scoped
  DE/EN toggle, hero, value cards, explainer, form (same fields, validation order, error keys,
  payload) or success panel, footer. The insert (`test_user_applications`) goes through the
  app's Supabase client; unit tests use a fake client only.
- `IntroScreen.tsx` — `IntroExperience.tsx`: eyebrow, MAXINA wordmark + Experience + flare,
  taglines, the reserved Orb slot and caption, the language pill (opens the shell's
  `LanguageSheet`), Login / Register → `/<tenant>` keeping the query (+ `tab=signup`).
- `src/ports/public.tsx` — the kit's Accordion / Checkbox / sonner `toast`, category / ruby /
  status colours from `@vitana/tokens`, the lucide icons.
- `NATIVE_ROUTES` in `src/navigation/resolve.ts` (+ `/apply`, `/maxina_support`, `/privacy`,
  `/terms`, and `/` a second time for `(public)/index.tsx`); 7 ledger rows → `native`;
  `/download` and `/maxina/app` untouched (`exception`, no route file).
- `src/i18n/*/publicLegalNative.json` — 10 new keys (brand words, DE/EN labels, list markers,
  © line), all 11 locales, DE first. Every other string reuses the web's keys
  (`screens.index.*`, `screens.legal.*`, `support.maxina.*`, `apply.*`, `intro.*`).
- No core change, no new dependency, no `app.config.ts` change.

## Native differences (program §4 allowed set / no native module)

- Intro: no background video (no video module in the app; the web clip is served from the
  web's static host), the Orb is the shell's ORB overlay (slot reserved), no Esc hint
  (desktop-only), no soundscape autoplay.
- Apply: no confetti and no hero video (the web's `HERO_VIDEO_URL` is null); token surfaces
  instead of the hard-coded warm gradient.
- Landing: the DEV toast shows the catalog title only (the web's description is a hard-coded
  English developer hint).

## Open item for the driver / owner

Expo Router ranks the N3 landing redirect `app/index.tsx` (ledger `native_only` `/`, signed out
→ `/maxina`) above `app/(public)/index.tsx` for the bare `/` URL. The spec keeps that redirect
"as N3 left it" and `app/index.tsx` is outside this lane's paths, so the storefront is built and
tested but a cold `/` still lands on `/maxina`. Making `/` show the storefront to signed-out
members (as the web does) is a one-line change in `app/index.tsx` and needs an owner decision.

Similarly, `/i/:code` system links are delivered to `auth-port` by the link router; the screen
consumes the delivered code when it mounts. An app-wide subscriber that opens `/i/:code` on a
cold-start link belongs to `src/linking/**` / `app/_layout.tsx` (outside this lane's paths).

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/public --ci` → PASS, 5 suites / 101 tests.
- `npm test -- --ci` → PASS, 85 suites / 2263 tests, 57 snapshots.
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS.
- `npm run parity:check` → PASS (435 rows, 37 native routes); `--sync` → no change.
- `core-closure --check` → up to date; NATIVE-CI script tests 68/68, eslint tests 22/22,
  `npx eslint apps/mobile packages` clean, gen-tokens / gen-core-extract / shell pins OK.
- i18n (`i18n-check.yml` steps): register, long words, subscriptions, stamp, audit → PASS / exit 0.
- Web `npm run build` → PASS; `npx vitest run src/i18n scripts/native` → 25/25.
- Red → green: `red-on-base.txt` (all 5 suites fail on origin/main).
- Not verified on staging: device runtime deferred to G1 (`staging-tests.json` `deferred_g1`).
- Preflight: see `commands.log`.
