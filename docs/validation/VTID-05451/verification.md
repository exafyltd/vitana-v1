# Verification — VTID-05451 (native-wave2-public-auth-onboarding-r3 / public-legal)

Native Wave 2 public-legal lane: the signed-out `PublicAppShell` branch — `/`, `/privacy`,
`/terms`, `/maxina_support`, `/i/:code`, `/apply`, `/_intro/:tenantSlug`. All commands run
offline (the native app has no production profile; `assertNotProduction()` refuses
prod/staging hosts). Linux, base `origin/main` ec8682fe. Every command and its counts:
`commands.log`.

## What was built

- `app/(public)/{privacy,terms,maxina_support,apply}.tsx`, `app/(public)/i/[code].tsx`,
  `app/(public)/_intro/[tenantSlug].tsx` — one route file per web path, each rendering its
  screen from `src/screens/public/`. `/` has no route file in this lane (see the follow-up).
- `PublicLandingScreen.tsx` — `src/pages/Index.tsx` (ShareEntry fallback, App.tsx:818): VITANA
  wordmark, intro lines, the five portal cards (Maxina → `/_intro/maxina` keeping the query,
  AlKalma → `/alkalma`, Exafy Admin → `/exafy-admin`, Vitana DEV → `<gateway>/command-hub/` in
  the system browser or the web's "not configured" error toast, Commerce → `/commerce-login`),
  footer. A resolving session paints a loader; a signed-in member goes on to `/home`. The
  component and its tests ship, but it is not mounted: a cold `/` is N3's `app/index.tsx`, so
  `PUBLIC.LANDING` stays `not_started`.
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
  `/terms`); 6 ledger rows → `native` (`PUBLIC.PRIVACY`, `PUBLIC.TERMS`, `/maxina_support`,
  `/i/:code`, `/apply`, `/_intro/:tenantSlug`); `PUBLIC.LANDING` stays `not_started`;
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

## Follow-up (needs plan amendment)

Review round 1 (head c1b4e18, blocking finding): a cold `/` is served by N3's landing redirect
`app/index.tsx` (ledger `native_only` `/`, signed out → `/maxina`), which Expo Router ranks above
`app/(public)/index.tsx`, so the storefront was unreachable while `PUBLIC.LANDING` was marked
`native`. `app/index.tsx` is outside this lane's paths. Driver decision: `PUBLIC.LANDING` goes
back to `not_started`, the shadowed `app/(public)/index.tsx` and the duplicate `/` in
`NATIVE_ROUTES` are removed, and `PublicLandingScreen` plus its tests stay in
`src/screens/public/**` / `tests/public/**` for a follow-up lane to mount.

1. **Mount the storefront at cold `/`.** Change `apps/mobile/app/index.tsx` so a signed-out user
   sees `PublicLandingScreen` (as the web's `Index.tsx` does), and a signed-in member keeps
   going to `/home`. Add a cold-start test (`renderRouter` with `initialUrl: '/'`, signed out →
   `public-landing`; signed in → `/home`). Then flip `PUBLIC.LANDING` to `native`.
2. **Cold-start `/i/:code` subscription (non-blocking).** `/i/:code` system links are delivered
   to `auth-port` by the link router; the screen consumes the delivered code when it mounts. An
   app-wide subscriber that opens `/i/:code` on a cold-start link belongs to `src/linking/**`
   and `app/_layout.tsx`, both outside this lane's paths.

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/public --ci` → PASS, 5 suites / 100 tests (fix round 1; was 101 with the
  `(public)/index.tsx` RTL-style case).
- `npm test -- --ci` → PASS, 85 suites / 2261 tests, 57 snapshots (fix round 1).
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS.
- `npm run parity:check` → PASS (435 rows, 36 native routes after fix round 1).
- `core-closure --check` → up to date; NATIVE-CI script tests 68/68, eslint tests 22/22,
  `npx eslint apps/mobile packages` clean, gen-tokens / gen-core-extract / shell pins OK.
- i18n (`i18n-check.yml` steps): register, long words, subscriptions, stamp, audit → PASS / exit 0.
- Web `npm run build` → PASS; `npx vitest run src/i18n scripts/native` → 25/25.
- Red → green: `red-on-base.txt` (all 5 suites fail on origin/main).
- Not verified on staging: device runtime deferred to G1 (`staging-tests.json` `deferred_g1`).
- Preflight: see `commands.log`.
