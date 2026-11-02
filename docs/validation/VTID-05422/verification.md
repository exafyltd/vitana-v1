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
  the `EUR_PER_USD` fallback rate. `data/actions.ts` holds the web's write calls
  (`liveWalletActions`, the app default), `data/flows.ts` the web popups' handlers and the
  Stripe deposit return leg, `data/depositReturn.ts` the hub's AppState / focus / return-param side.
- `iap.ts`: `isIAPRestricted()` = `Platform.OS === 'ios'`, the same rule the drawer already applies
  (`SideDrawer.tsx` → `drawer.ts`). `drawer.ts` and `SideDrawer.tsx` are unchanged.
- `src/i18n/*/walletHomeNative.json`: 15 new keys (fix 1: the withdrawal-method names and times,
  `flow.finishOnWeb` removed), DE first (du-form), then all 11 locales
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
| WalletPopup steps (fix 2): ExchangeAndSendStep `return null`; SendStep ungated | `exchange-and-send-step` in `IAP_GATED_FLOWS`; `send-step` ungated. Both are reached only from the "Transfer & convert" section, which iOS hides | iap-gate (unchanged): the section hidden on iOS |
| `Balance.tsx` `getContextualAction()` null; membership tab stays | `contextualAction()` null | iap-gate: every tab both ways |
| drawer `iapRestricted: Platform.OS === 'ios'` hides the Wallet row | unchanged | iap-gate: drawer both ways + source pin |

## The flows make the web's calls (fix 1)

Fix 1 corrects a misread of the driver brief. "No real payment or transfer call" applies to the
tests and the build session only. There was no owner instruction to defer the product calls. The
app default `liveWalletActions` (`data/actions.ts`) now makes the calls the mobile web makes, with
the same endpoints, request shapes and handling (`data/flows.ts`):

| Flow | Web source | Call | Web toasts |
|---|---|---|---|
| add funds | AddFundsPopup + useCreateDeposit | gateway `POST /api/v1/wallet/deposits/create` `{ amount_minor, currency: 'USD' }` (Bearer, `X-Vitana-Active-Role: community`), then Stripe Checkout in expo-web-browser | `redirectingToCheckout`; `transactionFailed` |
| deposit return | Wallet.tsx `depositId` / `depositResult` + useDeposit | `GET /api/v1/wallet/deposits/:id`, polled 8 × 2.5 s, then the wallet refetch | `fundsAddedSuccessfully` / `transactionFailed` / `depositCanceled` |
| buy credits | BuyCreditsPopup | RPC `process_wallet_exchange` USD → CREDITS | `exchangeCompleted`, `creditsPurchasedSuccessfully`; `purchaseFailed` |
| withdraw | WithdrawPopup (method select, fee, 2 s wait) | RPC `update_user_balance` subtract `withdrawal` | `withdrawalInitiated2`; `withdrawalFailed` |
| spend credits | SpendCreditsPopup | RPC `update_user_balance` subtract `purchase` | `success`; `error` |
| exchange | ExchangeStep (From / To selects, swap, seeded from the entry's currency) | RPC `process_wallet_exchange` with the selected pair and the core rate | `exchangeCompleted`; `exchangeFailed` |
| send | MakePaymentPopup (member search, currency, description) | `global_community_profiles` read, RPC `process_wallet_transfer`, `user_activity_log` + `messages` inserts | `transferSuccessful`, `paymentSent`; `paymentFailed` |
| request | PaymentRequestPopup | `messages` insert (`payment_request`, no recipient) | `paymentRequestSent`; `error` |
| exchange & send | ExchangeAndSendPopup | `user_activity_log` + `messages` inserts (the web makes no RPC here) | `exchangeSendCompleted`; `transactionFailed` |
| WalletPopup → Send (fix 2) | SendStep (member search, USD / VTNA Credits, optional description) | RPC `process_wallet_transfer`, then a `messages` insert `payment_sent` (`💸 Payment sent: <n> <CUR>` + `\n📝 <description>`); no step-level activity row | `transferSuccessful`; `missingInformation` / `insufficientBalance2` |
| WalletPopup → Exchange & Send (fix 2) | ExchangeAndSendStep + useWallet.exchangeAndSend | RPC `process_wallet_exchange_and_send` (`p_from_user_id`, `p_to_user_id`, `p_from_currency`, `p_to_currency`, `p_amount`, `p_exchange_rate`), the hook's two activity rows, then a `messages` insert `exchange_and_send` with `exchangeTransactionId` / `transferTransactionId` | `exchangeSendSuccessful`, `exchangeSendComplete`; `exchangeSendFailed` |
| balance top-up / tokens / upgrade | Balance.tsx dialogs | none: the web buttons have no handler | none |

Stripe return leg (brief rule "External checkout / portal return leg"): the created deposit is
marked pending. It is read again when the browser closes (iOS), on AppState 'active' (Android,
whose `openBrowserAsync` resolves `opened` at once) and on screen focus. Each read refetches the
wallet balances and transactions, and a settled deposit shows the web's toast. A deposit still
pending after the short poll stays pending for the next return. The web's return params
(`?depositId=&depositResult=success|canceled`) are handled when the link reaches the app.

Web behaviour carried over as is: `transferFunds` shows `transferSuccessful` first and does not
throw on failure, so the payment message is still sent. The request body always reads `$<amount>`.
Exchange & send (the direct ExchangeAndSendPopup) checks the amount against the popup's fixed
sample balance; the WalletPopup's Exchange & Send step checks the real from-currency balance.

Fix 2 (review of 1fef022): the exchange sheet is the web ExchangeStep. From and To list the web
`CURRENCY_CONFIGS` (USD, VTNA Credits; VTNA is no longer selectable on the web), To lists the
currencies other than From, the swap control is disabled while From = To, and the confirm button is
disabled while the amount is not above 0 and within the from-currency balance, or From = To. The
pair is seeded like the web: the quick action passes USD (From USD, To VTNA, as web
`getInitialToCurrency`, so the member picks To), the WalletPopup menu passes none (From CREDITS,
To VTNA). The WalletPopup's Send and Exchange & Send steps are their own sheets (`send-step`,
`exchange-and-send-step`) with the web steps' handlers; the direct MakePayment /
ExchangeAndSendPopup sheets are unchanged. Red on 1fef022: `red-fix2.txt`.

Tests run only against fakes (fake gateway wallet rail, Supabase double, mocked
expo-web-browser). No test and no session command called a live system or Stripe. Red on the
previous head: `red-fix1.txt`. The iap-gate tests are unchanged.

## Deviations from the spec (all recorded in the PR body)

1. The plan's sentence "balance + activity stay visible" on iOS describes only the inner
   `{!isIAPRestricted() && …}` branch. Today's web also redirects iOS from `/wallet` to `/home`.
   The owner rule (keep the gate exactly as today) and R3.2 (mirror one-for-one) win, so the
   redirect is mirrored too.
2. Not carried over: the spend catalogue (the quick amounts name the purchase as the web's quick
   spend does) and the request's optional due date (sent as `undefined`, as the web does when it
   is empty).
3. The web "intelligence" cards and the motivational banner are hardcoded English sample content.
   The native twins keep each card's translated title and summary and drop the invented rows, as
   the web's own Spotlight port did (VTID-05111, SR-24).
4. The web header's search button only logs, so it is omitted. The calendar button and the
   VitanaIndex / Autopilot chips belong to other lanes and are also omitted (same as native Home).
5. The web's `initialize_user_wallet` RPC is not carried over. The EUR/USD rate is always the `EUR_PER_USD` fallback. The web uses this value while its live
   request loads or fails. This lane makes no third-party request.

## Commands and results

See `commands.log`, which lists every command and its pass/fail counts.
