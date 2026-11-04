# VTID-05417 — spotlight-card-proportion / events: acceptance

Plan: `exafyltd/vitana-platform` `.kiro/specs/spotlight-card-proportion/plan.md` + `tasks.md` (lane `events`),
converged and policy-approved (`converged-auto-v1`). Owner approval of the layout: 2026-10-31, *"very good. yes, this
you can build"*. Builds on layout-core (VTID-05420, `SpotlightGrid`, `ScreenFrame layout`, `VCard spotlightLabel`,
grid skeleton), merged as `3ac1f5bb8`.

| Acceptance item | Evidence |
|---|---|
| E1: Events Spotlight body framed with `ScreenFrame layout="spotlight-grid"` | `src/pages/community/EventsAndMeetups.tsx` (Spotlight branch); staging spec asserts `data-screen-layout="spotlight-grid"` |
| E2: spotlight = `events[0]`, labelled (`spotlightLabel`), Details + Join | `EventsSpotlightBody.tsx` `FeaturedCard`; test "the next event is the one labelled spotlight card…" |
| Join uses the existing join/RSVP path, no new write | free event → `useEventParticipation(event.id, count).toggleParticipation()` (the hook `src/components/crossover/NewsCard.tsx:154` uses for event RSVP); paid / ticketed event or live room → the page's `handleCardClick` (`EventsAndMeetups.tsx`, `onOpen={handleCardClick}`), the same drawer / room path the cards' ticket CTA takes; already going → no Join. Tests "Join on a free event…", "Join on a paid / ticketed event or a live room…" |
| Tiles = `more.slice(0, 6)` as `standard`; row "Upcoming" = the rest as `compact` | test with 9 events: 6 standard in `[data-slot=tiles]`, 2 compact in `[data-slot=row]` |
| D8: Live now / You follow move from the nested rail to a section below, compact | test "Live now and You follow move below the grid…" (no `aside[data-spotlight-rail]`, section outside the grid) |
| D4: fewer tiles → only real tiles, no row, no filler; 0 events → shared empty state, no grid | tests "fewer than seven events…", "loading shows the grid skeleton, an empty tab…" |
| Loading: grid skeleton (1 spotlight + 6 standard + 5 compact) | test asserts `[data-skeleton-layout="spotlight-grid"]` and 12 `[data-vcard-skeleton]` |
| Click handlers: tile, row, Details open the page handler | test "tile, row and Details clicks open the page handler…" |
| Groups / Members / Live Rooms and flag-off / phones unchanged | `social-spotlight-pages.vtid-05110.test.tsx` green (unchanged); only the Events Spotlight branch passes `layout` |
| Locales: `spotlight.grid.events.*` (from layout-core, 11 locales) + existing `spotlightSocial` keys; numbers via `fmtNumber` | diff (no new key, no raw string) |
| RTL: logical classes only (`text-start`, `inset-0`, `gap-*`) | diff |
| Accessibility: Join and Details are named buttons; the title is a button; reading order spotlight → tiles → row → around | tests query by role + name |
| Staging proof | `tests/e2e/staging/vtid-05417-events-spotlight-grid.staging.spec.ts` (1400x900: one labelled spotlight at 30–45% width, tiles beside it, row below, compact header with 2 buttons, utility bar, no horizontal scroll; 390x844: no Spotlight frame, mobile nav) + updated `vtid-05110-social-spotlight.staging.spec.ts`. Read-only, nothing clicked |
| No weakening | the Events section went from 3 to 6 cases with more expects; `vtid-05110` staging spec only gains assertions (contract changed on purpose: the events card now lives in the grid's spotlight slot) |

Not verified on staging yet: it runs in STAGING-VERIFY after merge. Local screenshots were not taken (the staging
build is the visual proof; owner-approved mockup `events-proposed.png`).
