# Verification — VTID-05424 (native-wave2-wallet-r2 / wallet-rewards)

Native Wave 2 wallet-rewards lane: `/wallet/rewards` with `?tab=earn` (WALLET.REWARDS_EARN_MORE)
and `?tab=shop` (WALLET.REWARDS_SHOP). All commands ran offline in Linux worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-wallet-r2-wallet-rewards`, base `origin/main`
`a41e89a0d`; fix round 1 merged `origin/main` `ec8682fec` (#1544) and re-ran every check. The native app has no production profile; `assertNotProduction()` refuses prod/staging
hosts. Not verified on staging: device runtime deferred to G1.

## What was built

- `apps/mobile/src/screens/wallet-rewards/RewardsScreen.tsx` + `app/(app)/wallet/rewards.tsx`:
  twin of the phone branch of `src/pages/wallet/Rewards.tsx`. It has the "Zurück zur Wallet" link
  (`/wallet`), the header (title + description) and the N2 `Tabs` on the `tab` param
  (`earned` default, `earn`, `shop`; the legacy `?tab=intelligence` lands on `earn`, VTID-05037).
  A tab press writes the param back (`router.setParams`). `?shipping=paid|cancelled` is passed to
  the shop as on the web.
- `RewardRules.tsx`: twin of `VtnaRewardRules` (summary + earned balance + VTNA value, the rule
  groups with cap lines and earned badges, "Dafür gibt es keine VTNA", recent rewards).
- `EarnMore.tsx`: twin of `EarnMore` (the still-earnable actions with "Los geht's" to the web
  route via `navigateToWebPath`, the next-goal card with progress or "Zum Shop").
- `RewardShop.tsx`: twin of `RewardShop` (summary, balance, Stripe-return notes, item cards,
  orders) and its redeem Dialog as a bottom sheet with the same fields and the same `ready` rule.
- `data/rewards.ts`: the native twins of `useRewardRules`, `useRewardShop`, `useRewardOrders` and
  `redeemRewardItem`. They make the same gateway calls (GET `/api/v1/wallet/reward-rules`,
  `/api/v1/rewards/shop`, `/api/v1/rewards/orders`; POST `/api/v1/rewards/shop/redeem`) through
  the native client, which prefixes `/api/v1` itself, so the paths in the file are relative
  (`/rewards/shop`). Same per-member query keys, `enabled: !loading && !!userId` and stale times. The file also holds the pure
  helpers `itemText`, `stillEarnable`, `nextGoal` and `EARN_ACTION_ROUTES`. The web files that
  hold them import the community gateway / react-router (class B), so they are re-implemented,
  not extracted (R4). No core entry is added.
- `data/actions.ts`: `RewardShopActions`; the default is `redeemRewardItem`. `data/currency.ts`: the display currency (AsyncStorage
  key `vitana.wallet.displayCurrency`, default EUR) and the `EUR_PER_USD` fallback (0.92).
- `iap.ts`: `isIAPRestricted()` = `Platform.OS === 'ios'`, the rule the drawer already applies.
  `drawer.ts` and `SideDrawer.tsx` are unchanged.
- `apps/mobile/src/ports/wallet-rewards.ts`: re-exports N2's `Checkbox`, `Progress` and
  `notifySuccess` (kept out of `ports/ui.tsx`, which the parallel wallet-home lane edits).
- `src/i18n/*/walletRewardsNative.json`: 2 new keys (tab list label, the birth-date hint), DE first (du-form), then all 11 locales (pt você, fr tu, ru ты, ar).
  Every visible label of the web screen reuses the existing `wallet.*` keys.
- `apps/mobile/src/navigation/resolve.ts`: `/wallet/rewards` added to `NATIVE_ROUTES`.
- `apps/mobile/parity/ledger.json`: the 3 rows flipped `not_started` → `native`.
- `apps/mobile/maestro/wallet-rewards/README.md`: the G1 device-runtime flows (deferred).

## iOS IAP gate: kept exactly as today

The surface has one `isIAPRestricted()` branch on the web. The native screen mirrors it with
today's native rule. No gate is added, removed, widened or narrowed:

| Web branch | Native twin | Test (`tests/wallet-rewards/iap-gate.test.tsx`) |
|---|---|---|
| `Rewards.tsx` `useEffect`: iOS → `navigate('/home', { replace: true })` | `RewardsScreen` `useEffect`: iOS → `router.replace('/home')` | iOS redirects for `?tab=earned/earn/shop`; Android does not and shows the shop's redeem affordance |
| `VtnaRewardRules` / `EarnMore` / `RewardShop`: no gate | no gate | source pins: the web components have no gate, and only `RewardsScreen.tsx` reads it (once) |
| drawer `iapRestricted: Platform.OS === 'ios'` hides the Wallet row | unchanged | drawer both ways + source pin |

## Redeem: the web call, tested against a fake fetch only

The redeem sheet builds the web `RedeemRequest` and calls `RewardShopActions.redeem`. The default
is the web `redeemRewardItem`: POST `/api/v1/rewards/shop/redeem` with the JSON request and the
member's bearer token. A refusal or a non-JSON answer becomes `{ ok: false, error }` (gateway code,
else `REDEEM_FAILED`). The sheet handles the outcome as the web does: known code →
`wallet.rewardShop.errors.<code>`, else `errors.generic`; a `checkout_url` opens in the system
browser (web `window.location.assign`); success → `wallet.rewardShop.redeemed`, the `['wallet']`
queries refetch, the sheet closes.

The tests never reach a live system. The `redeem request` tests run the real native gateway client
(`createGatewayFetch`) over a fake fetch and assert the built request (URL, method, content type,
bearer token, body), the error-code mapping and the checkout URL. The other shop tests inject a
fake `RewardShopActions`. Red on the previous head `98877f016`: `red-fix1.txt` (3 failed).
The iOS gate tests (`iap-gate.test.tsx`) are unchanged.

## Deviations from the spec (all recorded in the PR body)

1. The plan, `requirements.md` R3.2 and `tasks.md` describe the gate as "shop purchase
   hidden/branched on iOS; the earn-more tab stays visible". Today's web code has no shop-level
   branch. Its only `isIAPRestricted()` call redirects the whole `/wallet/rewards` page to `/home`
   on iOS, and `RewardShop` / `EarnMore` / `VtnaRewardRules` have no gate. The owner rule (keep
   the gate exactly as today) and R3.2 (mirror one-for-one) win, so the redirect is mirrored. On
   iOS the earn-more tab is not reachable, the same as on the web today.
2. The ExpandableSearchButton + UniversalCalendarButton utility pair, the desktop SubNavigation
   and the desktop-only Spotlight layout are not carried over. The wallet-home lane made the same
   call for the hub.
3. The loading state uses react-query `isPending`. On the web, a disabled query (auth still
   loading) has `isLoading` false and no data, so the error line shows for a moment. Natively the
   loading line shows instead.
4. The web date input and country Select are a text field with a YYYY-MM-DD hint and a radio list
   (N2 has no date picker or select). The decorative lucide icons are dropped where the shell icon
   set has no match.
5. The EUR/USD rate is always the `EUR_PER_USD` fallback, the value the web uses while its live
   request loads or fails. This lane makes no third-party request. The constant is held locally
   until the wallet-home lane (VTID-05422) brings `exchangeRates` into `@vitana/core`.

## Commands and results

See `commands.log`, which lists every command and its pass/fail counts.
