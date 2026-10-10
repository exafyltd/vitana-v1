# Plan: "Mehr verdienen" replaces "Verdienst-Intelligenz" in Wallet › Rewards

<!-- plan:begin -->
## Problem (owner report 2026-10-10, phone screenshots)
- Wallet › Rewards tab "Verdienst-Intelligenz" (`src/pages/wallet/Rewards.tsx`, tab value `intelligence`,
  renders `EarningIntelligenceSplitScreen`) shows invented numbers: `mockCrossPlatformOpportunities`,
  `mockIntelligenceInsights` (EarningIntelligenceSplitScreen.tsx:38,71), `mockStreaks` / `mockOpportunities`
  (EarningStreaksAnalyticsCard.tsx:35,71) — "845 VTNA potential", "2.7x multiplier", "28 best streak".
  None of the intelligence cards fetch data. It is a two-column `SplitScreen` that breaks on a phone
  (words split letter by letter, overlapping numbers).
- Owner: the name is not understandable; the screen must be simple, help the member, and motivate them
  to start earning. Owner chose the name **"Mehr verdienen"** (EN "Earn more").
- Header text: "Belohnungen & Provisionen" and an English, hardcoded description
  ("Track your earnings, achievements, and referral rewards", Rewards.tsx) — no commissions live here.

## Change class
standard (app repo only; no migrations, no gateway change; >3 files).

## Changes (vitana-v1)
1. **New component `src/components/wallet/EarnMore.tsx`**, mobile-first single column, real data only:
   - Data: `useRewardRules()` (gateway `/rewards/overview`, VTID-04864 — rules with amount, earned flag,
     cap, used_in_window, earned_balance, recent) and `useRewardShop()` (VTID-04982 shop: items + earned
     balance).
   - **"Das kannst du noch verdienen" (you can still earn this)**: up to 5 actions the member can still be
     paid for in the current window —
     one-time rules not yet earned, and capped rules with `used_in_window < cap.count` — ordered by
     amount (highest first), one-time "first steps" before habits on a tie. Each row: rule name (existing
     `wallet.rewardRules.rules.<id>` strings), "+N VTNA", and a button "Los geht's" that deep-links to the
     place where the action happens, from a fixed map (`EARN_ACTION_ROUTES`) using registry routes:
     first_diary/diary_streak_* → `/daily-diary`; first_group → `/comm/groups`; first_event_rsvp →
     `/comm/events-meetups`; first_connection/five_connections → `/comm/members`; first_match_accepted →
     `/me/matches`; first_health_check / index_new_best → `/health/vitana-index`; profile_complete →
     `/me/profile`; invite_friend_joined/invited_friends_10 → `/invite`; autopilot_action_done →
     `/autopilot`; live_room_15min → `/comm/live-rooms`. A rule with no mapped route shows no button.
     `onboarding_complete` is skipped (not actionable from here). A test asserts every route in the map
     exists in `screens.json` with `access: "member"` (all eleven verified member today). Capped rows
     show their window with the existing strings (`wallet.rewardRules.capToday` / `capWeek` / `cap`,
     e.g. "heute 0 von 1", "diese Woche 1 von 3"), so daily and weekly rules are never mislabelled.
   - **"Dein nächstes Ziel" (your next goal)**: the cheapest active, available shop item the member
     cannot afford yet → "Noch X VTNA bis {item}" with a progress bar (earned_balance / price). One
     balance source: `earned_balance` from `useRewardRules()`; the shop hook is used only for items. If the
     member can already afford an item: "Du kannst schon {item} einlösen" + button to the Shop tab. If
     the shop is empty or fails: the card is hidden (no invented goal).
   - **All done state**: if nothing is left in any window, a short positive line + "Bald gibt es wieder
     neue VTNA" (window-agnostic; no "tomorrow" claim), and the never-earns list is not repeated here.
   - Loading / error states like VtnaRewardRules; every string from `src/i18n/<lc>/wallet.json`
     (`wallet.earnMore.*`), DE first, EN, then es, sr, fr, pl, pt, ru, tr, zh, ar marked
     `_pending_review` + stamps.
2. **Rewards.tsx**: tabs become **Verdient** (earned, existing VtnaRewardRules) · **Mehr verdienen**
   (value `earn`) · **Shop**. The short labels fit a 390 px phone without horizontal scrolling.
   `?tab=intelligence` (old links, Vitana registry) is mapped to `earn`. The page title becomes
   "Belohnungen"; both hardcoded English descriptions — the `SEO` description (Rewards.tsx:43) and the
   `StandardHeader` description (Rewards.tsx:62) — are replaced by i18n strings
   ("Verdiene VTNA mit dem, was dir guttut – und löse sie im Shop ein").
3. **Voice registry**: `WALLET.REWARDS_INTELLIGENCE` (`?tab=intelligence`) is replaced by
   `WALLET.REWARDS_EARN_MORE` (`/wallet/rewards?tab=earn`, EN/DE phrasings: "how can I earn more VTNA",
   "wie verdiene ich mehr VTNA", every locale title); the WALLET.REWARDS "shows" text drops
   "commissions".
4. **Dead code**: `EarningIntelligenceSplitScreen` is no longer rendered. It and its three mock-only
   child cards (EarningStreaksAnalyticsCard, CommissionForecastingCard, SocialEarningIntelligenceCard)
   are deleted only if nothing else imports them (verified with grep in the PR); otherwise left in place.
   Other mock cards used by the mobile Wallet's "Aktionen" mode are out of scope (noted below).
5. No What's New entry (replacement of an existing tab — owner rule 2026-10-08).

## Out of scope / deferred
- The mobile Wallet "Aktionen" mode cards (`PredictiveActionsCard`, `DynamicRewardOpportunityCard`) are
  also mock data; a separate VTID if the owner wants them replaced.
- Personalised ordering (e.g. by what the member usually does) — later, needs data.

## Tests
- Vitest `src/components/wallet/EarnMore.test.tsx`: ordering and filtering (earned one-time rules and
  exhausted capped rules hidden; max 5); deep-link buttons go to the mapped route; rule without route has
  no button; next-goal card shows the shortfall and progress, the "can already redeem" variant, and is
  hidden with an empty or failed shop; all-done state; no mock data imported; DE/EN key parity; every
  `EARN_ACTION_ROUTES` route exists in `screens.json`.
- Rewards page: tab labels, `?tab=intelligence` → earn, no `EarningIntelligenceSplitScreen` import,
  i18n header.
- Registry tests green; i18n stale check 0; lint/typecheck for touched files; build.
- Staging (read-only) Playwright spec: 390x844, sign in, open `/wallet/rewards?tab=earn`; the Earn More
  panel renders from real data (list or all-done state), no raw keys, no horizontal overflow, the three
  tabs fit without scrolling; `?tab=intelligence` lands on the same tab; desktop 1400x900 renders too.
- Screenshots phone + desktop, DE and AR (RTL).

## Files in scope
src/components/wallet/EarnMore.tsx (+ test); src/pages/wallet/Rewards.tsx; src/i18n/*/wallet.json +
i18n-source-stamps; src/navigation/registry/screens.json + locales/*.json; possibly deleted
src/components/wallet/intelligence/{EarningIntelligenceSplitScreen,EarningStreaksAnalyticsCard,
CommissionForecastingCard,SocialEarningIntelligenceCard}.tsx; tests/e2e/staging/<VTID>-*.spec.ts;
docs/validation/<VTID>/*; docs/SCREEN_INVENTORY.md; existing tests that reference the old tab
(src/pages/wallet/mobile-wallet-rewards.test.tsx:156 — the allowed tab list changes from
'intelligence' to 'earn').
<!-- plan:end -->


## Round 1 — planner responses
- F1 [major] today/tomorrow framing vs weekly caps → ACCEPTED: heading "Das kannst du noch verdienen",
  each capped row shows its own window via the existing capToday/capWeek/cap strings, all-done copy is
  window-agnostic ("Bald gibt es wieder neue VTNA").
- F2 [minor] locale count → ACCEPTED: locales listed explicitly.
- F3 [minor] window in filtering → ACKNOWLEDGED: `used_in_window < cap.count` stays (correct for all
  windows); the framing is covered by F1.
- F4 [minor] SEO description → ACCEPTED: both descriptions (L43, L62) move to i18n.
- F5 [minor] existing test assertion → ACCEPTED: named explicitly (L156, intelligence → earn).
- F6 [minor] /autopilot access → VERIFIED: AUTOPILOT.MY_JOURNEY is `access: "member"`, as are the other
  ten routes; the route-map test now also asserts access member.
- F7 [minor] one-time rule earned flag → ACKNOWLEDGED, no change: gateway concern; the button just
  takes the member to the action.
- Q2 single balance source → ACCEPTED: `useRewardRules().earned_balance` only.
- Q3 health check target → kept `/health/vitana-index` (member; the Vitana Index screen is where the
  health check and index score live).

## Round 2 — partner disposition
F1 closed, F2 closed, F3 closed, F4 closed, F5 closed, F6 closed, F7 acknowledged. No new blockers or majors.
Verdict: CONVERGED (2 rounds, standard class).

## Owner approval
APPROVED by owner in Claude Code session 2026-10-10 ("Yes") — plan hash c9d451c256941d055ee87c84122b936c1a08ea7d4fffa9520c47085f99bd7253

VTID: VTID-05037 (allocated after approval; `<VTID>` in the plan body left verbatim so the hash matches).
