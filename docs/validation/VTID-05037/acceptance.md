# VTID-05037 — Wallet › Rewards: "Mehr verdienen" replaces "Verdienst-Intelligenz"

Plan: docs/validation/VTID-05037/plan-sparring.md (converged in 2 rounds, owner approved 2026-10-10, plan hash c9d451c2…7253).

AC-1 The tabs are Verdient · Mehr verdienen · Shop with short labels that fit a 390 px phone without the tab row scrolling; the old `?tab=intelligence` link opens "Mehr verdienen".
TEST: src/components/wallet/EarnMore.test.tsx

AC-2 "Das kannst du noch verdienen" lists up to 5 rules that can still pay in their current window (earned one-time rules, exhausted capped rules and onboarding are left out), highest reward first, first steps before community on a tie; capped rows show their window ("heute" / "diese Woche" / rolling).
TEST: src/components/wallet/EarnMore.test.tsx

AC-3 Every row with a mapped action has a "Los geht's" button to where the action happens; every target is a member screen in the registry; a rule without a mapped route has no button.
TEST: src/components/wallet/EarnMore.test.tsx

AC-4 "Dein nächstes Ziel" shows the shortfall and progress to the cheapest unaffordable shop item, or "Du kannst schon … einlösen" with a link to the Shop; it is hidden when the shop is empty or fails. One balance source: the reward rules' earned_balance.
TEST: src/components/wallet/EarnMore.test.tsx

AC-5 When nothing can pay right now, a window-agnostic all-done message is shown.
TEST: src/components/wallet/EarnMore.test.tsx

AC-6 The page title is "Belohnungen"; the SEO and header descriptions come from the catalog (no raw English); the mock EarningIntelligenceSplitScreen is gone; DE/EN parity; 9 other locales marked _pending_review and stamped.
TEST: src/components/wallet/EarnMore.test.tsx

AC-7 The Rewards tabs follow the app direction (Arabic right-to-left).
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-8 Vitana's registry replaces WALLET.REWARDS_INTELLIGENCE with WALLET.REWARDS_EARN_MORE (/wallet/rewards?tab=earn) in screens.json and every locale file; every /wallet/rewards tab in the registry exists.
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-9 Staging (read-only), phone and desktop: the tab renders real reward rules (list or all-done), no raw keys, tabs fit, no horizontal overflow, the old link lands there.
TEST: tests/e2e/staging/vtid-05037-earn-more.staging.spec.ts

Screenshots: screenshots/earn-more-mobile-de.png, screenshots/earn-more-desktop-de.png — local build, the two GET responses (reward rules, shop) served from fixtures by Playwright because the staging gateway's CORS rejects 127.0.0.1; nothing was written anywhere.

Decisions taken
- The three mock child cards (EarningStreaksAnalyticsCard, CommissionForecastingCard, SocialEarningIntelligenceCard) are still imported by EarningOptimizationSplitScreen on Wallet › Balance, so only EarningIntelligenceSplitScreen (used only here) was deleted, as the plan allowed.
- Radix Tabs default to dir="ltr" and the app has no DirectionProvider, so the Rewards tabs now take `dir` from useRTL() — the existing pattern from settings/Support.tsx. The app-wide gap (every other SplitBar) is not changed here.
- Arabic: a real Arabic screenshot could not be produced locally (the test account's server-side language preference wins over local storage); RTL is proven by the unit test (AC-7) and the components use logical properties only.
- No What's New entry (replacement of an existing tab, owner rule 2026-10-08).
