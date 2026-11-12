# Verification — VTID-05522 (native-wave2-ai-pages-r2 / ai-chat)

Native Wave 2 ai-chat lane: the Talk-to-Vitana text / ticket-capture screen
(`/comm/talk-to-vitana`, ledger row `COMM.TALK_TO_VITANA`) ported to native. All commands
ran offline (no network in tests; the native app has no production profile). Linux,
worktree `vitana-v1/.worktrees/native-wave2-ai-pages-r2-ai-chat`, base `origin/main`
6b9137ac5. Every command and its counts: `commands.log`.

**Not verified on staging:** device runtime deferred to G1 (`next_actor: owner`). The
screen's writes (ticket submit, confirm / reopen, enrichment-card dismiss) are proven by
built-request assertions against a mocked gateway in `apps/mobile/tests/ai-chat/`
(requirements R5.2).

## What the mobile web renders, and where it is in the port

`src/pages/community/TalkToVitana.tsx:136-200` (the non-Spotlight branch; Spotlight is
desktop + flag only, `:39-41`):

| Web (phone) | Native |
|---|---|
| `AppLayout` → `MobileAppShell` (TopAppBar, drawer, bottom nav) | the N3 shell (`app/(app)/_layout.tsx`) |
| `StandardHeader` — on phones the `h1` title only (`StandardHeader.tsx:42-50`) | `TalkToVitanaScreen` header text |
| `SubNavigation items={communityNavigation}` (`navigation.ts:17-24`) | `CommunitySubNav.tsx` (6 pills, active one highlighted, tap → `navigateToWebPath`) |
| Panel: "What's on your mind?", topic `Select` (`TICKET_KINDS`, label + hint), `Textarea` (6 rows, `maxLength` 10 000), Send (disabled while sending or empty), success notice (title, number, "View ticket" → `?ticket=`), AI note | `TalkToVitanaScreen.tsx` form; `data/tickets.ts` submit |
| `EnrichmentCardStrip screen="talk-to-vitana"` (server cards, then F1 / F2 / F3, max 3) | `VitanaCardStrip.tsx`, `cards/FeatureCards.tsx`, `cards/FeatureCardShell.tsx` |
| `MyTicketsList headingKey="screens.community.yourReports"` | `TalkTicketsList.tsx` |

The page has no utility bar of its own (no search, calendar, Life Compass or gift voucher
in `TalkToVitana.tsx`; the web `MobileAppShell.tsx` renders only TopAppBar + drawer), no
sheet and no modal; `SEO` is a web `<head>` tag. No purchase surface, so no iOS IAP gate
applies, and no hosted external page, so there is no checkout / portal return leg.

## Data (class B, re-implemented natively; no `@vitana/core` change)

- Submit: `POST /api/v1/feedback/tickets` `{ raw_text (trimmed), kind, screen_path:
  '/comm/talk-to-vitana', app_version? }` with `X-Vitana-Active-Role: community`, as
  `communityFetch` sends it. A non-2xx reply → the web's "Couldn't submit" toast; the reply's
  `id` + `ticket_number` → the success notice; the form resets and the ticket list refetches.
- Ticket list: the support lane's native data layer (`GET /feedback/tickets/mine?limit=100`,
  30 s refetch, confirm / reopen POSTs), shared through `src/ports/ai-chat.tsx`.
- Card strip: the home lane's native enrichment hook (`GET /enrichment-cards?screen=talk-to-vitana`,
  server dismiss); F1 reads `GET /journey-checklist?locale=` + `GET /journey/state`; F2 reads
  `vitana_index_scores` (trailing 7 days → the web's `health_compute_vitana_index` self-heal →
  latest row); F3 is static. The 7-day feature-card hide uses the web key
  `vitana.card.<type>.dismissed_at` in AsyncStorage.

## i18n / RTL

Every string comes from existing catalog keys (`screens.community.*`, `supportTickets.*`,
`toasts.community.*`, `screens.vitanaCards.*`, `screens.home.*`, `screens.vitanaIdentity.*`,
`drawerNav.*`, `mobileNav.overview`), so the lane adds no shard and no key (R2.4).
`i18n.test.tsx` renders the full screen in all 11 locales with no raw key, Arabic in RTL,
and scans the lane's files for physical left/right and literal `<Text>` text.

## Red → green

`red-on-base.txt`: the lane's tests on origin/main 6b9137ac5 — 4 suites fail (the row is
`not_started`, the path resolves to `unported`, the route file and `src/screens/ai-chat/**`
are missing). On the lane head: `npx jest tests/ai-chat` 4 suites, 66 tests pass (run twice
at default workers); full `npm test` 97 suites, 2738 tests pass.

## Deviations from the web screen (documented, inside the plan)

1. **Community section labels are translated.** The web `communityNavigation` has no
   `i18nKey`, so the web shows the English names in every locale. The native row reads the
   catalog keys that already name those sections (`drawerNav.events` etc.).
2. **F1 has no "Play episode" button.** The web shows it only inside the web
   `AudiobookPlayerProvider`; the native app has no audiobook player, so F1 takes the web's
   own no-player branch ("View My Journey" → `/autopilot`). The web's localStorage overlay of
   just-tapped sessions has no native writer; the server journey state is used as is.
3. **F2 "View Index".** The web opens the `VitanaIndexSheet` overlay (`vitana:open-index`).
   The native card emits the same event on the bus when a handler is registered, otherwise it
   opens `/health/vitana-index` (the page the web header opens for the Index).
4. **Server cards** render through the home lane's native `EnrichmentCard` (title, description,
   deep-link CTA, X), as Home's native feed does; a server-sent F1–F3 keeps its own face.
5. **Topic select** opens as the kit's bottom-sheet list (N2 documented difference).

## Follow-ups (not in this lane)

- No ORB change was needed or made (`apps/mobile/src/orb/**` untouched).
- `src/identity/GuidedModeProvider.tsx:71` requests `/api/v1/journey/state` through the
  gateway fetch, which already prefixes `/api/v1` (`gatewayApiUrl`), so it calls
  `/api/v1/api/v1/journey/state`. Not this lane's file; noted for the shell owner.
- Device-runtime parity on G1 (`maestro/ai-chat/README.md`, `staging-tests.json`).
