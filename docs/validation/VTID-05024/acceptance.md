# VTID-05024 — Rewards on the mobile Wallet

Plan: docs/validation/VTID-05024/plan-sparring.md (converged in 2 rounds, owner approved 2026-10-10, plan hash ca3c4d5f…7566).

AC-1 On a phone, the Wallet's mode pill lists a fourth option, "Rewards" (🎁), next to Balances, Activity and Actions; choosing it opens /wallet/rewards (no new route).
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-2 /wallet?tab=rewards (Vitana and links) opens /wallet/rewards (replace); the existing balances/activity/actions values behave as before.
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-3 On a phone, Wallet › Rewards shows a "← Back to Wallet" link to /wallet and not the desktop tab bar, with phone padding; desktop is unchanged (tab bar, no back link).
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-4 The labels exist in DE and EN; the other nine languages are translated, marked _pending_review and stamped against their source.
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-5 Vitana's screen registry no longer points at the removed Rewards tabs (pending, referral) in screens.json or any locale file, every /wallet/rewards entry targets an existing tab, and WALLET.REWARDS_SHOP opens the Shop tab.
TEST: src/pages/wallet/mobile-wallet-rewards.test.tsx

AC-6 Staging (read-only), phone viewport: the pill opens Rewards with the Shop tab and the back link and no horizontal overflow, the back link returns to /wallet, and /wallet?tab=rewards lands on Rewards.
TEST: tests/e2e/staging/vtid-05024-mobile-wallet-rewards.staging.spec.ts

Screenshots (local build against the staging gateway, read-only, de-DE): screenshots/wallet-modes-mobile.png, screenshots/rewards-mobile.png, screenshots/rewards-desktop.png. The red "couldn't load" line in the earned panel is local-only: the staging gateway's CORS rejects the 127.0.0.1 origin (preflight 500) and allows preview-aws.vitanaland.com (204).

Decisions taken
- The iPhone app keeps redirecting the whole Wallet (Rewards included) to Home; unchanged, a separate owner decision.
- No What's New entry: a navigation fix to an existing screen (owner rule 2026-10-08).
- The gateway's committed nav-registry snapshot (vitana-platform) is not edited here; it is refreshed from this app's published /nav-registry.json by its own process.
