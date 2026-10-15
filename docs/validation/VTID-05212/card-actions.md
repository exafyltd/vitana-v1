# VTID-05212 — every Vitana card's action (C7 record)

What each card's button does after this lane, and the evidence. **Unit** = Vitest on this branch: green, 437 files /
3,468 tests. **Staging** = `tests/e2e/staging/vtid-05212-card-actions.staging.spec.ts` (read-only). The staging result
is recorded by STAGING-VERIFY on the merge commit.

Kiro cannot sign in to staging from its sandbox. The cards that only navigate (no network) are proven by Unit, and
their routes by `card-deeplinks.test.ts` (each one is a real, non-redirect route and is in the screen registry).

| Card | Button does | Changed here | Evidence |
|---|---|---|---|
| E1 Photo | `/me/profile#avatar` → Identity editor | — | Unit (enrichment-cards, card-actions C6 chat) |
| E2 Bio | `/me/profile#about` → About editor | — | Unit (same) |
| E3 First post | opens the post composer | — | Unit (enrichment-cards) |
| E4 Interests | opens the interests picker; saving re-reads cards | — | Unit (enrichment-cards) |
| E5 Location | `/me/profile#location` → About editor (location field) | — | Unit (enrichment-cards, C6 chat) |
| E6 Instagram | OAuth start; in Appilix: `?return=mobile` + overlay + poller | **C5** | Unit (social-appilix). Hidden on every screen until Meta OAuth exists (VTID-05211). |
| E7 Facebook | same as E6 | **C5** | same |
| E8 Calendar | `/connectors?tab=productivity#calendar` → scrolls to Mail, Calendar & Contacts | **C3** | Unit (useHashScroll), Staging |
| E9 Contacts | `/connectors?tab=productivity#contacts` → same section | **C3** | Unit (useHashScroll), Staging |
| E10 Notifications | push permission + subscribe (web / Appilix) | — | Unit (enrichment-cards) |
| E11 Cover | `/me/profile#cover` → Cover Library | — | Unit (enrichment-cards, C6 chat) |
| F1 Guided Journey | plays the next session or opens `/autopilot` | — | Unit (feature-cards) |
| F2 Vitana Index | opens the Index sheet (AppLayout listener) | — | Unit (feature-cards) |
| F3 Daily diary | `/daily-diary` | — | Unit (feature-cards, C6 chat) |
| F4 Ask Vitana | opens the ORB; fallback `/comm/talk-to-vitana` | **C2** | Unit (card-actions C2, also in chat) |
| F5 Matches | `/me/matches` | — | Unit (feature-cards, C6 chat) |
| F6 Autopilot | `/autopilot` | — | Unit (feature-cards, C6 chat) |
| F7 Invite | share sheet / copy link | — | Unit (feature-cards) |
| F8 Did you know | accepts and opens the tip; never stuck disabled | **C4** | Unit (card-actions C4, feature-cards) |
| F9 Calendar | `/calendar` | — | Unit (feature-cards, C6 chat) |
| F10 Media | opens the composer in media mode | — | Unit (feature-cards) |
| F11 Discover | `/discover` | — | Unit (feature-cards, C6 chat) |
| G1 Complete profile | first open profile step, else About editor | **C1** | Unit (card-actions C1, boost-cards), Staging |
| G2 New matches | `/me/matches` | — | Unit (boost-cards, C6 chat) |
| G3 Streak at risk | `/daily-diary` | — | Unit (boost-cards, C6 chat) |
