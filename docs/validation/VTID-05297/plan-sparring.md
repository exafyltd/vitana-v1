# Plan sparring record — VTID-05297 (native-wave2-home-feed-news / home)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on branch `kiro/native-wave2-home-feed-news/plan`:
`.kiro/specs/native-wave2-home-feed-news/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-10-21T11:17:45.157+00:00.

- Sparring session: `d108df80-fd56-498d-a0de-871c4c939a4b`
- Final plan hash: `c60167b66118540c3e2b1d16c9ba166c1b90a4527dc519d9aa4b5300b16f79e2`
- VTIDs allocated: VTID-05296, **VTID-05297** (this lane: `home`), VTID-05298
- Rounds / responses: `sparring/round-1..3.md`, `sparring/responses-1..3.md`,
  `sparring/s2-round-1..3.md`, `sparring/s2-responses-1..2.md`, `sparring/state.json`

## Approval

The converged plan is approved by policy `converged-auto-v1` (owner decision
2026-10-14, VTID-05214/05218): a plan sparred by CI whose session converged is
approved by policy and not sent to the owner as Gate 1. The VTID was allocated by
CI after convergence (`lanes/home.md` log, 2026-10-21T11:19Z).

## Scope of this lane (home)

Port the Home News Feed to native (apps/mobile) on the N3 shell at 1:1 mobile-web
parity for the `home` lane, mirroring the mobile-web (`useIsMobile`) branch of
`src/pages/Home.tsx`:

- Extract the three class-A feed modules into `@vitana/core` (`feed-compose`,
  `news-feed-ranker`, `vitana-card-catalog`); re-implement the class-B feed hooks
  (`useNewsFeed`, `useAllNewsFeed`, `useEnrichmentCards`) natively against the
  injected `getSupabase()` client — never added to core.
- The composed `FeedItem[]` FlatList of cards (one per kind), the native per-item
  error boundary, pull-to-refresh, infinite scroll and the All / Community tabs
  (`tab` search param); the compose / comments / notif deep-link surfaces; i18n
  across 11 locales (DE-first, pt Brazilian, ar RTL).
- Fake-gateway / fixture unit tests under `apps/mobile/tests/home/`.
- The 9 home parity rows flip `not_started` → `native`: `HOME.CREATE_POST`,
  `HOME.NEWS_ALL`, `HOME.NEWS_COMMUNITY`, `HOME.OVERVIEW`, `LIFE_COMPASS.OVERLAY`,
  `OVERLAY.MASTER_ACTION`, `/home/comments`, `/home/compose`, `/home/notif`.

Device-runtime parity (Maestro / simulator / emulator) is DEFERRED to G1 and
recorded in `staging-tests.json` under `deferred_g1` (`next_actor: owner`), never
run in CI. Requirements R1–R6 and design decisions 1–5
(`.kiro/specs/native-wave2-home-feed-news/{requirements,design}.md`) are
authoritative.
