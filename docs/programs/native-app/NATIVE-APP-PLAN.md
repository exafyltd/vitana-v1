# Maxina native iOS + Android app — mirror of today's mobile app (plan v1)

Planner: Claude Code session, 2026-10-10. Revision r5 (owner correction 2026-10-10: data on Aurora, Supabase Auth stays; re-sparred). Companion to the converged Health Hub plan v2
(`health-hub-plan-v2.md`, sha256 1bb0b3f1…); this plan is its Workstream B and owns its Phase 3.

<!-- plan:begin -->

## Meta
- **Change class:** standard (program plan; every wave/area below becomes its own sparred plan + VTID before code).
- **Scope (areas):** new native app project in `exafyltd/vitana-v1` (`apps/mobile/`), a shared package extracted from
  `src/` (`packages/core/`), gateway push/auth/ORB touch points in `exafyltd/vitana-platform`
  (`services/gateway/src/services/notification-service.ts`, `routes/notifications.ts`, `orb/live/**` protocol docs),
  `public/.well-known/*`, CI workflows for native builds.
- **Goal:** replace the Appilix WebView app with a true native iOS and Android app that **mirrors today's mobile app 1:1 —
  same screens, same layout, same navigation, same wording** — and adds native capabilities (Apple Health, Health Connect,
  native push, native voice). Not a redesign.

## 1. What "today's mobile app" is (verified on origin/main 2026-10-10, vitana-v1 52bd7ebe0)
- **Source of truth is the code, not the old mobile docs:** `docs/mobile-screen-inventory.md`, `mobile-wireframes.md`,
  `mobile-pwa-rules.md` describe `/m/*` routes and a `MobileLayout` that were never built (App.tsx has no `/m/` routes).
  `docs/MOBILE_SCREEN_INVENTORY.md` matches reality except the calendar popup (now `/calendar`).
- **Shell:** `useIsMobile()` breakpoint 1024 px (`src/hooks/use-mobile.tsx`); `AppLayout` → `MobileAppShell`
  (`src/components/mobile/MobileAppShell.tsx`: `TopAppBar` + `SideDrawerNav` + edge-swipe) + `MobileBottomNav`
  + global overlays (`AutopilotPopup`, `WalletPopup`, `VitanaIndexSheet`, `InviteSheet`); `PublicAppShell` when signed out.
  - TopAppBar: 32 px content height plus the top safe-area inset (`calc(env(safe-area-inset-top) + 32px)`), kebab → drawer, tenant name centre (Maxina sky-blue gradient), soundscape mute + LIVE pill.
  - Bottom bar (`MobileBottomNav.tsx`): 5 slots with the ORB in the centre; per mode — Community: News /home, Inbox,
    [ORB], Journey /autopilot, Events; Patient, Professional and three Business variants have their own tabs; staff/admin none.
  - Drawer (`SideDrawerNav.tsx`, `src/config/drawer-nav.config.ts`): profile header + role pill (`RoleSwitcherSheet`),
    quick actions (search, calendar, notifications, autopilot, cart), community rows, language picker.
  - Patterns: `MobileModePill` on ~11 screens, `ResponsivePopover`/`ResponsiveDialog` bottom sheets, shadcn dialog/sheet,
    vaul drawers, header chips (Vitana Index, Autopilot). Guided mode (`GuidedModeProvider`).
- **Screens:** App.tsx ≈433 `path=` routes, of which ≈346 are page routes once redirects (`<Navigate>`) are removed —
  the parity ledger computes its list with a script (registry + App.tsx, redirects excluded) instead of this hand count; a community member reaches ≈100 authed routes (≈93 registry destinations,
  `src/navigation/registry/screens.json` 185 entries incl. tab variants + 8 overlays) plus ≈26 public/auth/legal routes.
  Role screens on mobile: patient 8, professional 8, staff 8, business 4 (+ join/invite/connect), admin 96 (desktop-dense
  consoles, drawer only); backoffice/developer/infra are excluded on mobile (`MOBILE_EXCLUDED_ROLES`).
  57 `Mobile*.tsx` components; 26 pages + 36 components branch on `useIsMobile()`.
- **Design system:** `tailwind.config.ts` semantic HSL tokens (pillar, domain, sys colours), `src/index.css` light/dark
  tokens, Cormorant editorial font, radius 0.5rem; two tenants (`maxina`, `alkalma`) via `useTenant.tsx`; dark mode via
  `next-themes`; RTL via `RTLProvider` (ar); 11 locales in `src/i18n/`, all `status='ga'` in the live
  `supported_locales` table (ar, de, en, es, fr, pl, pt, ru, sr, tr, zh) — the vitana-v1 CLAUDE.md "Active locales"
  paragraph listing five is out of date and is corrected in this program's first docs PR.
- **Appilix bridge actually used** (`src/lib/appilix.ts`, `useAppilix.ts`): hide native bars, status-bar style, push
  identity registration (+ reload hacks), FCM token over 5 channels, `isIOSApp`/`isIAPRestricted` (~18 files hide wallet
  purchases on iOS). Open-drawer/navigate/share/launch_external are defined but unused.
- **Push:** gateway `notification-service.ts` sends FCM (Firebase project `lovable-vitana-vers1`, via GCP workload
  identity on AWS) and Appilix push; routes URL pushes to Appilix first and excludes `Appilix …` tokens from FCM because an
  FCM tap crashes the WebView; tokens via `POST /api/v1/notifications/token`; deep link in `data.url`.
- **Auth:** Supabase Auth (session in localStorage), email/password, Apple + Google OAuth through a browser round trip
  (`useSupabaseOAuthSignIn.ts`, `OAuthComplete.tsx`); reset/confirm links to `vitanaland.com`; tenant switch RPC + session
  refresh; role preference RPCs. Gateway accepts the Supabase JWT (`middleware/auth-supabase-jwt.ts`).
- **ORB:** not React — `orb-widget.js` (~6.5k lines, gateway `frontend/command-hub/`) injected via `index.html`; 16 kHz
  mic capture with ScriptProcessor, 24 kHz PCM playback, WS or SSE transport (`/api/v1/orb/live/*`), full-duplex gate
  mirroring `orb/live/duplex/full-duplex-gate.ts`, navigation directives → routes.
- **Database direction:** Aurora (`vitana-aurora-prod`, AWS eu-central-1) is the platform's database target; the
  Supabase→Aurora cutover is not yet reflected in the code — the committed `.env` still points the frontend at
  `inmkhvwdcuyhnxkgfvsb.supabase.co`, ~270 gateway files use `SUPABASE_URL` vs 5 using `AURORA_DATABASE_URL`, and the
  cutover runbook (`docs/AURORA-CUTOVER-RUNBOOK-2026-09-20.md`) records a postponed freeze window. A `postgrest-aurora`
  proxy service exists (`services/postgrest-aurora-proxy/`); it sends PostgREST traffic to Aurora and passes `/auth/v1/*`
  through to Supabase. Target architecture (runbook Option A, owner decision 2026-09-19): **data on Aurora, sign-in on
  Supabase Auth permanently**, files on Supabase Storage until a separate S3 move. Today the web app also uses Supabase
  Realtime directly (~66 files: chat, unread, notifications, wallet, feed, calls signalling, typing) and Supabase Storage
  (~34 files: avatars, covers, media, diary photos, video, health reports).
- **Media/realtime:** Supabase realtime (chat, unread, notifications, calls signalling, wallet, feed); React Query
  persisted (`src/lib/query-persist.ts`); Daily.co live rooms; raw WebRTC 1:1 calls; `<video>` shorts; ffmpeg.wasm
  compression; html2canvas share images; MediaRecorder + Web Speech; Stripe Checkout redirects.
- **Store identity:** iOS bundle `com.exafy.maxina` (team 62Q26QSEJW, App Store id 6742813861); Android
  `com.vitanaland.app` (two signing fingerprints in `public/.well-known/assetlinks.json`). Who holds signing keys and store
  accounts (Exafy vs Appilix) is **not confirmed**.
- **Compliance gap:** subscription/credit checkout, bookings, tickets and vouchers open Stripe without the iOS gate; only
  wallet surfaces are gated.

## 2. Key decisions (recommendation in bold, owner confirms)
1. **Framework: React Native with Expo (custom dev client, prebuild), TypeScript, NativeWind.** Reason: mirror the same
   screens with the same Tailwind class vocabulary, reuse React Query, zustand, supabase-js, gateway clients, types and
   the i18n JSON shards unchanged; one codebase for both stores; Expo modules for native health, audio and push code.
   (Swift + Kotlin doubles the UI work; Capacitor keeps web UI — rejected because the owner asked for true native.)
2. **Same store listings:** ship as an **update** to `com.exafy.maxina` and `com.vitanaland.app`, so members get it
   without reinstalling and keep reviews. Precondition: Exafy controls both store accounts and the Android signing key
   (or Play App Signing upload-key reset). If not, owner decides between recovery and new listings.
3. **Scope of native parity:** all community-member screens and overlays, public/auth/legal screens, patient,
   professional, staff and business mode screens. **Admin (96 consoles) is not rebuilt natively:** opened in an in-app
   browser (SFSafariViewController / Custom Tabs) with the same session. Backoffice/dev stay excluded as today.
4. **No hybrid public release:** internal/TestFlight builds may use a temporary in-app web fallback for unported screens,
   but the public store release ships only when every in-scope screen is native.
5. **Payments on iOS:** before submission, decide per purchase type (subscriptions, credits, bookings, tickets,
   vouchers, wallet) whether it is a physical/real-world service (external payment allowed) or digital content (StoreKit IAP
   or hidden on iOS). Default: keep today's behaviour and extend the `isIAPRestricted` gate to every digital purchase until
   decided. Android: same review for Google Play Billing.
6. **Push provider:** FCM via React Native Firebase on both platforms (APNs through FCM), keeping the gateway sender.
   The gateway initialises Firebase with project `lovable-vitana-vers1` (`notification-service.ts` L32), the GCP project
   whose billing was disabled 2026-08-16. **Hard gate G2 (Wave 0, own VTID):** prove FCM delivery from that project works
   and that Exafy owns it, or provision a new Firebase project and migrate the gateway sender (and web push) before any
   native push work starts. This also protects today's web push.
7. **Admin consoles** open in the **system browser**, where the admin signs in on the web as today; SFSafariViewController
   and Custom Tabs do not share the app's session, so no session hand-off is attempted in v1.
8. **Fonts:** confirm the Cormorant licence permits embedding in native app binaries (OFL expected) in Wave 0.

## 2a. Hard gates before Wave 1 starts
- **G1 Isolated test environment:** two profiles sharing one test identity provider, never production.
  - **Identity, realtime, files:** a separate free-tier Supabase project used only for testing (test sign-in incl.
    Apple/Google test configuration, Realtime, Storage buckets mirroring production's). This follows the owner's
    "Supabase for auth" decision and creates no users in the production auth tenant.
  - **Profile A "today" (pre-cutover):** that test project's own Postgres, seeded from migrations plus synthetic
    members — mirrors production as it runs today, so every lane, including realtime- and upload-driven ones (chat, feed,
    calls, media, diary, profile photos), is fully testable on G1.
  - **Profile B "Aurora":** an Aurora test cluster in `eu-central-1` behind its own `postgrest-aurora` proxy (proxy smoke
    test made runnable first), auth still from the test project — used to prove the app works unchanged after the cutover.
    Realtime-on-Aurora follows the platform's cutover decision (`docs/AURORA-B5-REALTIME-INVENTORY.md`) and is not
    invented here.
  - The test gateway and proxy trust only the test project's JWT secret/JWKS; a test proves production tokens are rejected.
  - Lane test matrix: every lane's exit criterion runs on Profile A; data-path lanes also run a smoke on Profile B. All development, QA and internal/TestFlight builds point
  at G1 — never at production data. Shared with the Health Hub plan Phase 0T; this program co-owns it and cannot pass
  Wave 0 without it. G1 is the first Wave 0 deliverable (weeks 0–2); it is seeded from migrations plus a fixup migration
  for `tr` in `supported_locales` (added to the live table by hand, not by a migration; own VTID). Builds pointing at production are only the store builds used by real members in the phased rollout,
  after QA on G1 passed; real members using the app is product use, not testing.
- **G2 Push backend proven** (see decision 6).
- **G3 Store and signing ownership:** Exafy confirms access to App Store Connect (team 62Q26QSEJW), Play Console and the
  Android app-signing/upload key within 2 weeks. Contingency if not resolved: new listings with new identifiers plus an
  in-app migration notice in the Appilix app — owner decision before Wave 1.

## 3. Architecture
- **Repo layout (vitana-v1):** `apps/mobile/` (Expo app), `packages/core/` (extracted platform-neutral code: gateway and
  Supabase clients, query keys and hooks without DOM, types, zod schemas, i18n catalogue loader, business rules such as
  `business-mode.ts`, role switching, drawer/nav configs, registry), `packages/tokens/` (design tokens generated from
  `tailwind.config.ts` + `index.css` so web and native share one source). The web app imports the same packages.
  **Extraction is phased (Wave 1, sized 2–4 weeks, own VTIDs):** (1) dependency analysis listing the exact modules
  that move and their DOM/browser coupling; (2) `@vitana/core` starts as a re-export layer over `src/` via TypeScript path
  aliases, so nothing moves and the web app is unchanged; (3) modules move one at a time, each PR gated by the full web
  build + Vitest + registry tests; (4) any move that fails is reverted on its own without blocking the native lanes,
  which keep consuming the re-export layer.
- **UI kit "Vitana Native UI":** native equivalents of every shadcn/Radix primitive in use (button, card, dialog → modal,
  sheet/vaul/ResponsiveDialog → bottom sheet, popover, tabs, select, switch, slider, accordion, avatar, toast/sonner,
  tooltip → long-press hint, progress, checkbox, radio, scroll area), plus Vitana components (MobileModePill, header chips,
  TopAppBar, BottomNav, SideDrawer, RoleSwitcherSheet). Same props where possible so screen ports are mechanical.
- **Navigation:** Expo Router; route paths identical to web paths (`/home`, `/inbox/u/:id`, `/comm/events-meetups`, …),
  so push `data.url`, universal links, ORB navigation directives and `screens.json` resolve the same in both apps.
  Bottom bar and drawer per mode driven by the shared configs.
- **Library mapping:** framer-motion → Reanimated (incl. the tab underline); embla → FlatList/reanimated-carousel;
  Daily.co → `@daily-co/react-native-daily-js`; WebRTC → `react-native-webrtc` (+ CallKit/ConnectionService later);
  `<video>` → expo-video; ffmpeg.wasm → native compression module; html2canvas → react-native-view-shot;
  qrcode.react → react-native-qrcode-svg; canvas-confetti → RN confetti; MediaRecorder/Web Speech → expo-audio + native STT
  or the existing `transcribe-audio` path; `navigator.share` → native share sheet; `navigator.vibrate` → expo-haptics;
  React Query persister → MMKV; safe areas → react-native-safe-area-context (also fixes today's missing `pb-safe`).
- **Database independence (configuration, not new gateway work):** the native app uses the same clients as the web app —
  gateway, the PostgREST-compatible data API, and the Supabase client for auth, Realtime and Storage — with every endpoint
  taken from build configuration per environment (G1 profile A/B, staging, production). The Aurora cutover therefore
  changes configuration, not app code. Realtime and Storage calls sit behind thin adapters in `packages/core` so a later
  platform move (e.g. lab files to S3) is a single change; no gateway replacement for realtime or uploads is built in
  this program.
- **Auth:** supabase-js (auth client) in RN with session in Keychain/Keystore (expo-secure-store); native Sign in with Apple and Google
  → `signInWithIdToken`; email/password unchanged; universal links / App Links for confirm, reset, invite (`/i/:code`) and
  OAuth return; tenant and role switching reuse the same RPCs.
- **ORB native:** a native voice module (Swift AVAudioEngine with `.voiceChat` AEC; Kotlin AudioRecord
  `VOICE_COMMUNICATION` + AcousticEchoCanceler) doing 16 kHz capture and 24 kHz playback, the same WS/SSE protocol as
  `orb-widget.js`, the full-duplex gate constants shared from `full-duplex-gate.ts` with a parity test, interruption and
  route-change handling, and navigation directives mapped through the shared registry. The ORB FAB sits in the bottom
  bar's centre slot exactly as today. Built first as a spike because it is the highest risk.
- **Health Sync module:** implements the Health Hub plan's Health Sync contract (HealthKit + Health Connect, consent
  before OS permission, anchors/change tokens, background delivery/WorkManager, offline queue, Keychain-stored token).
- **Push:** RN Firebase messaging; token registered at `POST /notifications/token` with `device_type` `ios_native` /
  `android_native`; tap → same route via `data.url`; badge counts; notification categories for chat replies later.
  Gateway change: native tokens use FCM directly (the "Appilix first" routing and the `Appilix`-label exclusion only apply
  to legacy Appilix tokens); Appilix sending removed after the migration window.
- **Remote config / kill switches:** no member-facing feature-flag endpoint exists today, so the gateway gets a small
  read-only `GET /api/v1/app-config` (own VTID, sparred) returning per-platform flags and the minimum supported version;
  the app fails safe (cached last config, features default off) when it is unreachable.
- **Transition period:** during the phased rollout the gateway serves both clients — Appilix tokens keep today's routing
  (`notification-service.ts` Appilix-first path), native tokens go straight to FCM; Appilix sending and bridge code are
  removed only after the adoption threshold (decision 7).
- **Wallet:** the native app mirrors the existing wallet routes only; no new wallet routes (NEVER rule 26).

## 4. Parity method (how "mirror 1:1" is proven)
- **Parity ledger:** every in-scope route from `screens.json` + role/public routes gets a row (web path, native status,
  owner, last parity check). A CI test fails when `screens.json` gains a member route without a native entry or a recorded
  exception — the same pattern the registry already uses for App.tsx.
- **Visual parity:** for each screen, automated screenshots of the web app at 390×844 (staging, read-only) and of the
  native app on iOS simulator and Android emulator (sim-use / Maestro), compared side by side with a tolerance; differences
  are fixed or recorded as accepted native-platform differences (fonts rendering, system sheets, keyboard).
- **Functional parity checklist per screen type** (each ledger row records it, Maestro on G1):
  list/feed — initial load, scroll to end/pagination, pull to refresh, tap item, empty and error state;
  detail — open from list and from deep link, back navigation (gesture and button), actions;
  form/compose — keyboard avoidance, focus order, validation messages, submit success and error;
  sheet/mode pill — open, switch every value, dismiss by gesture; media — play/pause, background behaviour;
  realtime — new item arrives while open; plus accessibility labels on every interactive element.
- **Lane exit criterion:** every ledger row in the lane has its checklist green on iOS and Android, at least one
  Maestro journey per screen, screenshot parity reviewed, and RTL (`ar`) screenshots.
- Existing Vitest tests ported to the shared hooks; all strings through the same i18n keys (no new hardcoded strings).
- **Allowed native improvements only:** platform transitions and gestures, keyboard avoidance, safe areas, haptics,
  system share/permission sheets. No layout or content changes.

## 5. Waves
| Wave | Weeks | Content | Exit criterion |
|---|---|---|---|
| 0 Decisions, gates & setup | 0–4 | §2 decisions; gates G1–G3; payment classification; font licence; Expo project + CI (EAS or GitHub macOS runners); extraction dependency analysis; parity ledger script + screenshot tooling; G1 first (weeks 0–2), then the ORB audio spike on one platform (weeks 2–4; if G1 slips it may run against the staging gateway because a voice session writes no member data, owner told) | G1–G3 passed; spike captures 16 kHz PCM on iOS byte-compatible with `orb-widget.js` frames and plays 24 kHz PCM from the gateway on G1 |
| 1 Foundation | 4–12 | `@vitana/core` re-export + phased moves; tokens; UI kit; shell (TopAppBar, BottomNav incl. ORB slot, SideDrawer, RoleSwitcher, mode pills, sheets); auth, tenant, roles; i18n (11 locales) + RTL + dark mode + tenant theming; push + deep links + universal links; app-config endpoint; Health Sync module (contract v1) | signed-in G1 member navigates the full shell in all modes, receives a push and opens its deep link, on both platforms |
| 1b ORB native (workstream) | 4–12 | native voice modules on both platforms, WS/SSE protocol, full-duplex gate parity test, interruption/route handling, navigation directives, FAB in the centre slot | a full multi-turn ORB conversation with barge-in and a navigation directive on both platforms against G1; echo test zero gate openings on real devices |
| 2 Screen ports (parallel lanes) | 8–22 (UI kit core primitives and the shell are finished in weeks 4–8 first; lane-specific components are built on demand inside each lane) | Lanes by area, each its own sparred plan + VTID: Home/feed/news · Inbox/chat/calls · Journey/Guided/Autopilot · Health/Vitana Index/biology + Health Sync UI · Events/calendar/reminders/live rooms · Media hub/shorts · Discover/commerce/cart/orders · Wallet (iOS gates) · Profile/settings/support/connectors · Memory/diary · AI pages · Sharing/Business hub · Patient/Professional/Staff/Business modes · Public/auth/onboarding/legal | every in-scope ledger row native and parity-checked |
| 3 Beta & release | 20–26 | internal + TestFlight/closed track with staff and volunteer members; store review (HealthKit, Health Connect declaration, privacy labels, IAP); phased rollout 1→10→50→100 %; Appilix push and bridge code removed after adoption threshold | ≥95 % of active mobile members on native; crash-free sessions ≥99.5 % |

Estimate: ≈6–7 months with 3–4 mobile engineers working with Claude Code sessions per lane (one lane = one branch +
VTIDs), 1 designer for parity review, QA with real devices. Estimate to be re-checked after the Wave 0 spike.

## 6. Verification and safety (CLAUDE.md rules apply to native too)
- No test writes on production: native dev/beta builds point at G1. The staging gateway uses the production database,
  so native e2e is **read-only** (sign-in, navigate, read) exactly like web staging; write paths are covered by unit and
  integration tests and by the isolated test environment from the Health Hub plan (Phase 0T) once it exists.
- Push tests use registered test accounts (`notification_test_actors`, `service_bot_accounts`) and never fan out to members.
- Staging verification gate: each lane adds `docs/validation/<VTID>/staging-tests.json` entries for its screens (read-only).
- What's New card for the native launch; i18n rules (DE first, du-form, 11 locales), RTL checked per screen.

## 7. Ongoing cost and governance after launch
- Every future mobile feature is built for web and native. Mitigation: shared `packages/core` for logic, shared tokens,
  the parity ledger CI test, and a rule that a mobile-visible PR ships both or records an exception.
- Mobile web (browser) stays available; Appilix is retired.

## 8. Owner decisions
1. Framework: React Native + Expo (recommended) vs Swift + Kotlin.
2. Confirm access to App Store Connect, Play Console and the Android signing/upload key; update existing listings.
3. Admin consoles in an in-app browser rather than rebuilt natively.
4. iOS/Android payment classification per purchase type (and whether StoreKit/Play Billing is introduced).
5. Firebase project ownership/health, or a new Firebase project for push.
6. Team: 3–4 mobile engineers, designer, QA; parallel Claude Code lanes.
7. Rollout threshold for retiring Appilix.
8. Fund the isolated test environment (hard gate G1), shared with the Health Hub plan Phase 0T.

<!-- plan:end -->

## Planner responses — round 1
- **F1 [blocker] ACCEPTED.** New §2a hard gate G1: isolated Supabase + gateway config; all dev/QA/beta builds point at it; Wave 0 cannot exit without it; only store builds used by real members point at production. §6 updated accordingly.
- **F2 [major] ACCEPTED.** Extraction phased in Wave 1 (2–4 weeks): dependency analysis, re-export layer via path aliases first, one module per PR, independent revert.
- **F3 [major] ACCEPTED.** Wave 0 spike narrowed to one platform audio-format compatibility; ORB native is its own Wave 1b workstream (8 weeks) with a full conversation + barge-in exit criterion.
- **F4 [major] ACCEPTED.** Hard gate G2 with its own VTID before native push work; covers today's web push too.
- **F5 [major] ACCEPTED.** Functional checklist per screen type and a per-lane exit criterion (both platforms, ≥1 Maestro journey per screen, RTL screenshots).
- **F6 [major] ACCEPTED.** Hard gate G3 with a 2-week limit and a contingency (new listings + migration notice), owner decision before Wave 1.
- **F7 [major] REJECTED.** Live `supported_locales` (read-only query, 2026-10-10) has all 11 locales `status='ga'`: ar, de, en, es, fr, pl, pt, ru, sr, tr, zh. The vitana-v1 CLAUDE.md "Active locales" paragraph listing five is stale; the plan keeps 11 and adds correcting that paragraph.
- **F8 [minor] ACCEPTED.** TopAppBar described as 32 px content + top safe-area inset.
- **F9 [minor] ACCEPTED.** Route count computed by the ledger script; methodology stated.
- **F10 [minor] ACCEPTED.** Font licence check added (decision 8).
- **Q1:** mirrors existing wallet routes only; no new wallet routes (§3 Wallet line). The wallet lane follows the iOS purchase decision 5.
- **Q2:** no member-facing flag endpoint exists; a small read-only `GET /api/v1/app-config` is added as its own sparred VTID.
- **Q3:** gateway serves both push paths during rollout (§3 Transition period).
- **Q4:** correct — no session sharing; admins use the system browser and sign in there (decision 7).

## Planner responses — round 2
- **F11 [minor] ACCEPTED.** G1 is the first Wave 0 deliverable (weeks 0–2); the ORB spike runs weeks 2–4, with a read-only staging-gateway fallback if G1 slips.
- **F12 [minor] ACCEPTED.** A fixup migration adding `tr` to `supported_locales` is part of G1 seeding (own VTID).
- **Q1:** UI kit core primitives and the shell are completed in weeks 4–8 before lanes start; lane-specific components are built on demand per lane (§5 Wave 2 row).

## Verdict
CONVERGED after 2 rounds (partner round-2 verdict); minors folded in. Owner decisions: plan §8 items 1–8.

## Planner responses — owner correction (2026-10-10)
- Owner: "We use Aurora, not Supabase." G1 is now an AWS-only Aurora test environment through the existing `postgrest-aurora` proxy; the app is database-independent via gateway + PostgREST-compatible API + configuration per environment, with adapters for realtime and storage. Verified facts about the current code state recorded in §1 (frontend `.env`, gateway usage counts, runbook).

## Planner responses — owner-correction round 3
- **F13 [blocker] ACCEPTED.** G1 names its identity provider: a separate free-tier Supabase project for test auth (plus Realtime and Storage), consistent with the owner's Supabase-for-auth decision; never production auth; production tokens rejected by test.
- **F14 [major] ACCEPTED.** G1 Profile A (test project's own Postgres + Realtime + Storage) mirrors production as it runs today, so every lane is fully testable; Profile B (Aurora via proxy) proves the post-cutover data path. Lane test matrix stated.
- **Q1:** No — the native app uses the Supabase client for auth, Realtime and Storage exactly like the web app; "database independence" means endpoints from configuration plus thin adapters, not new gateway routes.
