# VTID-03942 — Fix sold-out campaign CTA still showing "Buy Ticket"

## Context

Rung 3 of a 5-rung staged trust-building exercise for the
Operator/autopilot execution plane, executed directly by this Claude Code
session per explicit platform-owner instruction (proxying the task itself
— no `exafy_admin` credentials to invoke the real `autopilot_execute_task`
on-ramp). This is the first FRONTEND rung — verified entirely via a mocked
network layer (`supabase.rpc` mocked directly), per this repo's absolute
rule: no live Supabase writes, no live calls of any kind against any real
backend for verification, on any host including staging/preview.

## Bug

`PublicCampaignLanding.tsx` fetches a campaign's linked event via the
`get_public_event_details` RPC, which already returns `is_sold_out`. But
the page dropped that field entirely when building its local
`LinkedEventTicketInfo` state, and then hardcoded `isSoldOut: false` (with
a `// TODO: Fetch from event data` comment) when computing the CTA config
— so a campaign linked to a genuinely sold-out event still rendered a "Buy
Ticket" button instead of "Sold Out".

The sibling page `PublicEventLanding.tsx` already had the correct pattern
(`isSoldOut: event?.is_sold_out || false`) — this was a real, isolated
regression in one file, not a missing feature.

## Fix

1. Added `is_sold_out: boolean` to the `LinkedEventTicketInfo` interface.
2. Populated it from the RPC response (`event.is_sold_out || false`) in
   the existing `setLinkedEventTickets(...)` call.
3. Replaced the hardcoded `isSoldOut: false` with
   `linkedEventTickets?.is_sold_out || false`.

Three lines changed, one file (`src/pages/PublicCampaignLanding.tsx`), no
other logic touched.

## Acceptance Criteria

AC-1 — A campaign linked to a sold-out event renders the "Sold Out" CTA
(disabled), not "Buy Ticket".

TEST (new file): `src/pages/PublicCampaignLanding.test.tsx` — "shows 'Sold
Out' when the linked event is sold out, instead of a buy-ticket CTA".

AC-2 — No regression: a campaign linked to an event that still has tickets
available continues to render the normal buy-ticket CTA.

TEST: same file — "does NOT show 'Sold Out' when the linked event still
has tickets available (no regression)".

## Verification (all against mocked network — no live backend calls)

- `tsc --noEmit`: clean (`outputs/tsc-noemit.txt`).
- New suite: `outputs/vitest-new-suite.txt` — 2/2 passing.
- Full frontend suite (regression check): `outputs/vitest-full-suite.txt`
  — 116/116 test files, 619/619 tests passing, 0 failures.

`supabase.rpc` is mocked directly in the test file (`vi.mock('@/integrations/supabase/client', ...)`)
— the test never contacts any real Supabase project, staging or
production. `react-router-dom` hooks, `useAuth`, `useTranslation`, `SEO`,
and `EventTicketSelector` are also mocked/stubbed to isolate the page's
own CTA-wiring logic from unrelated rendering concerns.

## What this does NOT do

- Does not touch `PublicEventLanding.tsx` — it already had the correct
  pattern and was used only as a reference, not a file to edit.
- Does not add any new user-visible text — the existing
  `eventCta.soldOut`/`eventCta.buyTicket` i18n keys were already wired
  into `getLocalizedPublicLandingCta()`; this fix only corrects which
  branch that function takes.
- Does not touch sidebar navigation, Wallet routes, or any other
  forbidden-by-CLAUDE.md surface.

## OASIS impact

OASIS_IMPACT: no — a frontend data-plumbing bug fix, no schema/event changes.
