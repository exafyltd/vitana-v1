# Acceptance — VTID-05478 (welcome-finish-r2 / new-members-feed-client)

Plan: `exafyltd/vitana-platform:.kiro/specs/welcome-finish-r2/plan.md` §3–§4, `tasks.md` B1–B4. Depends on the gateway route of
VTID-05477 (`GET /api/v1/community/new-members`, exafyltd/vitana-platform).

The “new members” card in the News feed (All tab) and the Community tab now lists people from the gateway, which removes
test, service and bot accounts and the viewer (fail closed). The browser no longer reads `global_community_profiles` for it.

## UX acceptance
Nothing new is shown to a member: same card markup, same copy, no new strings. If the gateway is slow, down, or refuses, the
card is hidden and the rest of the feed is unaffected (5 s timeout, never a fallback to the table).

AC-1 Both hooks fetch the listing from the gateway route with the member's bearer token and no longer query `global_community_profiles` for new members.
TEST: src/hooks/community-intro-feed.vtid-05206.test.ts ("asks the gateway with the member's bearer token", "asks the gateway (token from the session)")
TEST: src/hooks/useNewMembersFeed.test.ts ("calls the gateway route with limit 5 and the given bearer token", "never reads the table")

AC-2 Any failure shows no card: 503 `exclusion_lookup_failed`, 401, `ok:false`, malformed body, network error, timeout, no token (and then no request is sent).
TEST: src/hooks/useNewMembersFeed.test.ts ("returns [] on …", "returns [] with no token and sends nothing")
TEST: src/hooks/community-intro-feed.vtid-05206.test.ts ("a gateway failure (%s) shows no card and never falls back to the table")
TEST: src/hooks/useNewsFeed.community-error-logging.test.ts ("logs on a failed new-members gateway call")

AC-3 Members returned by the gateway become cards (All tab: viewer and already-greeted members still dropped; Community tab: card id is keyed by user id).
TEST: src/hooks/useAllNewsFeed.new-members.test.ts
TEST: src/hooks/community-intro-feed.vtid-05206.test.ts ("members returned by the gateway become cards")

AC-4 Opt-in, visibility, 7-day window and test/service/bot exclusion are enforced by the gateway route, not re-implemented in the client.
TEST: services/gateway/test/vtid-05477-new-members-feed.test.ts (exafyltd/vitana-platform, lane new-members-feed-api)

AC-5 Staging (read-only): signed in as the test account, opening the feed sends one GET to the gateway route with a bearer token, the response has the contract shape (or a 401/403/503 that shows no card), and no read of the opt-in columns of `global_community_profiles` is made from the browser.
UI: tests/e2e/staging/vtid-05478-new-members-feed.staging.spec.ts

Red on base: `outputs/red-on-base.txt` (the hooks still query the table; the helper does not exist).
Limitations: listing contents on staging are not asserted against the real exclusion lists (service-side tables the browser cannot read, and staging writes are forbidden); that behaviour is proven by the gateway jest suite. This lane must not deploy before the gateway lane is on staging; until then the card is hidden (fail safe).
