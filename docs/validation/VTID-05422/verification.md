# Verification — VTID-05422 (native-wave2-wallet-r2 / wallet-home)

Native Wave 2 wallet-home lane: the `/wallet` hub (with `?tab=activity|actions` and the
WalletPopup overlay) and the `/wallet/balance` detail (with `?tab=membership|optimization|tokens`).
All commands ran offline in Linux worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-wallet-r2-wallet-home`, base `origin/main`
`a41e89a0d`. The native app has no production profile; `assertNotProduction()` refuses prod/staging
hosts. Not verified on staging: device runtime deferred to G1.

## What was built

- `packages/core/src/exchangeRates.ts` + `packages/core/manifest.json`: re-export of the pure
  `src/lib/exchangeRates.ts` (no imports, no IO). `node scripts/native/core-closure.mjs --write`
  regenerated `packages/core/closure.generated.json` and
  `scripts/native/mobile-ci-paths.generated.json` (one line each). `apps/mobile/src/ports/wallet.ts`
  is the port the screens import.
- `apps/mobile/src/screens/wallet-home/WalletScreen.tsx` + `app/(app)/wallet/index.tsx`: twin of
  the mobile-web branch of `src/pages/Wallet.tsx`. It has the header, the mode pill (Balances /
  Activity / Actions / Rewards → `/wallet/rewards`) and the Actions button that opens the
  WalletPopup (`components/WalletMasterActionSheet.tsx`). The Balances mode has the cash card
  (€ / $ toggle) and the VTNA Credits card, plus the quick actions. The Activity mode shows the
  `?filter=` badge and the 10 newest transactions. The Actions mode shows the actions cards.
  The flows are bottom sheets (`components/WalletFlowSheet.tsx`).
- `apps/mobile/src/screens/wallet-home/BalanceScreen.tsx` + `app/(app)/wallet/balance.tsx`: twin of
  `src/pages/wallet/Balance.tsx` (phone layout). It has the credits / tokens / membership /
  optimization panes via the `tab` param (`router.setParams`), the contextual action, and the
  top-up / buy-stake / upgrade sheets.
- `data/wallet.ts`: the native read twin of `useWallet`. It runs the same two PostgREST reads
  (`user_wallets` by `user_id`; `wallet_transactions` from/to the member, newest 10) through
  `getSupabase()`. `data/currency.ts` holds the display currency (AsyncStorage, default EUR) and
  the `EUR_PER_USD` fallback rate. `data/actions.ts` defines `WalletActions`.
- `iap.ts`: `isIAPRestricted()` = `Platform.OS === 'ios'`, the same rule the drawer already applies
  (`SideDrawer.tsx` → `drawer.ts`). `drawer.ts` and `SideDrawer.tsx` are unchanged.
- `src/i18n/*/walletHomeNative.json`: 12 new keys, DE first (du-form), then all 11 locales
  (pt você, fr tu, ru ты, ar). The existing `wallet.*`, `walletActions.*`, `screens.wallet.*`,
  `screens.payment.*`, `spotlightTierB.wallet.*` and `toasts.wallet.*` keys are reused.
- `apps/mobile/src/ports/ui.tsx`: 14 lucide glyphs added to the icon map.
  `apps/mobile/src/navigation/resolve.ts`: `/wallet` and `/wallet/balance` added to `NATIVE_ROUTES`.
- `apps/mobile/parity/ledger.json`: the 8 rows flipped `not_started` → `native`.
- `apps/mobile/maestro/wallet-home/README.md`: the G1 device-runtime flows (deferred).

## iOS IAP gate (owner decision 4 / program decision 5): kept exactly as today

Every web `isIAPRestricted()` branch is mirrored one-for-one with today's native rule. No gate is
added, removed, widened or narrowed:

| Web branch | Native twin | Test |
|---|---|---|
| `Wallet.tsx` redirects iOS to `/home` (replace) | `WalletScreen` `router.replace('/home')` | iap-gate: iOS redirects / Android does not |
| `Wallet.tsx` `{!isIAPRestricted() && …}` around the balance cards + quick actions | same condition | iap-gate: iOS hides / Android shows |
| `WalletMasterActionPopup` hides "Transfer & convert" | same | iap-gate: both ways |
| `MobileWalletQuickActions` filters add-funds / buy-credits / exchange / withdraw | same filter | iap-gate: iOS keeps only send / Android all five |
| AddFunds / BuyCredits / Withdraw / SpendCredits / ExchangeStep / ExchangeAndSend `return null`; MakePayment / PaymentRequest ungated | `WalletFlowSheet` returns null for those six kinds; send / request ungated | iap-gate: six popups both ways, send / request ungated on iOS |
| `Balance.tsx` `getContextualAction()` null; membership tab stays | `contextualAction()` null | iap-gate: every tab both ways |
| drawer `iapRestricted: Platform.OS === 'ios'` hides the Wallet row | unchanged | iap-gate: drawer both ways + source pin |

## No payment, transfer or redeem call

The flows check the amount the same way the web does, then call `WalletActions.submit`. The
default `WalletActions` makes no call. It shows the toast `walletHomeNative.flow.finishOnWeb`
(finish in the web wallet). The tests inject a fake and assert that no wallet RPC and no write ran.
The web's `initialize_user_wallet` RPC, the Stripe deposit return leg and the live FX request are
not carried over.

## Deviations from the spec (all recorded in the PR body)

1. The plan's sentence "balance + activity stay visible" on iOS describes only the inner
   `{!isIAPRestricted() && …}` branch. Today's web also redirects iOS from `/wallet` to `/home`.
   The owner rule (keep the gate exactly as today) and R3.2 (mirror one-for-one) win, so the
   redirect is mirrored too.
2. The flows' confirm buttons hand the request to `WalletActions`, which makes no call by default
   (owner instruction). Wiring a real gateway is a later wallet FEAT behind decision 5 and G1. The
   recipient search (send / request / exchange & send), the withdrawal-method select and the spend
   catalogue are also deferred.
3. The web "intelligence" cards and the motivational banner are hardcoded English sample content.
   The native twins keep each card's translated title and summary and drop the invented rows, as
   the web's own Spotlight port did (VTID-05111, SR-24).
4. The web header's search button only logs, so it is omitted. The calendar button and the
   VitanaIndex / Autopilot chips belong to other lanes and are also omitted (same as native Home).
5. The EUR/USD rate is always the `EUR_PER_USD` fallback. The web uses this value while its live
   request loads or fails. This lane makes no third-party request.

## Commands and results

See `commands.log`, which lists every command and its pass/fail counts.
