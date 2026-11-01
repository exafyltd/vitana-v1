# VTID-05418 — acceptance (spotlight-card-proportion/find-a-match)

Plan: vitana-platform `.kiro/specs/spotlight-card-proportion/plan.md` (D3, D4, D9) and `tasks.md` section
`find-a-match` (F1-F5). Depends on `layout-core` (VTID-05420: `SpotlightGrid`, `ScreenFrame layout`,
`VCard.spotlightLabel`, `spotlight.grid.*` keys).

| Item | Where | Status |
|---|---|---|
| F1 `adapters/match.ts` maps a match to `VCardData` (score, name/handle, cover, shared goals, `/u/<vid>`; anonymous partner-seek = no name, cover or link); exported from `adapters/index.ts` | `src/components/ui/vcard/adapters/match.ts` | done |
| F2 `FindMatchSpotlightBody`: spotlight = `matches[0]` with `spotlightLabel`, match %, shared goals, Say hello + View profile; tiles = `matches.slice(1, 7)` standard; row "More people with your goals" = leftover matches compact; 0 matches = the page's empty state; loading = grid skeleton | `src/components/community/spotlight/FindMatchSpotlightBody.tsx` | done |
| F3 `FindPartner.tsx`: matches view only → `ScreenFrame layout="spotlight-grid"` + body; board / posts / members keep `resultsBody`; mobile + flag-off unchanged | `src/pages/community/FindPartner.tsx` | done |
| F4 tests: new `find-match-spotlight.test.tsx`; `social-spotlight-pages.vtid-05110.test.tsx` gains FindPartner flag-on (1 spotlight) / flag-off (no VCards) / board-view cases; Groups = 0 spotlight unchanged | tests | done |
| F5 staging spec + manifest with `allowAbortedWrites` for `daily_matches` / `generate-daily-matches` | `tests/e2e/staging/vtid-05418-find-match-spotlight-grid.staging.spec.ts`, `staging-tests.json` | done |

Contract: Say hello = the existing outgoing express-interest call `transitionMatch(match_id, 'responded_by_a')`
with the same toasts as `FindPartnerMatchCard`'s "Interest" (`src/components/intents/FindPartnerMatchCard.tsx`
`expressInterest`); View profile = the card's own `/u/<vid>` hop, marking the match viewed. No new endpoint, no
new write path. Staging never clicks Say hello.

Strings: only existing keys (`screens.community.scorepctMatch`, `screens.intents.anonymousMatch`,
`spotlightSocial.common.member`) and the `spotlight.grid.match.*` keys owned by `layout-core` (D6). No shard edit.
