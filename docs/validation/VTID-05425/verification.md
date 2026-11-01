# Verification — VTID-05425 (native-wave2-wallet-r2 / wallet-subscriptions)

Native Wave 2 wallet-subscriptions lane: the `/wallet/subscriptions` overview and the
`/profile/subscriptions` storefront. All commands ran offline in the Linux worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-wallet-r2-wallet-subscriptions`, base
`origin/main` `a41e89a0d`. The native app has no production profile; `assertNotProduction()`
refuses prod/staging hosts. Not verified on staging: device runtime deferred to G1.

## What was built

- `apps/mobile/src/screens/wallet-subscriptions/SubscriptionsScreen.tsx` +
  `app/(app)/wallet/subscriptions.tsx`: twin of the phone branch of
  `src/pages/wallet/Subscriptions.tsx` (the Spotlight frame is desktop + flag only). It has the
  wallet sub-nav (web `walletNavigation`), the mobile header, and then, in the web order: privacy
  promises, launch-grant banner, founding banner, redeem card (free plan only), plan state,
  earnings, headline plans, larger plans, feature usage, credit packs, FAQ.
- `ProfileSubscriptionsScreen.tsx` + `app/(app)/profile/subscriptions.tsx`: twin of
  `ProfileSubscriptionsRouter`'s mobile branch, the `MobileSubscriptions` storefront. Native is
  always the phone context, so there is no desktop redirect. Storefront order: back + header,
  plan state, launch-grant, founding, redeem (free), headline plans, larger plans, usage, credit
  packs, earnings, promises, FAQ, and the bottom "Manage" CTA to `/settings?mode=billing` for
  members with a subscription (destructive when past due).
- `components/*`: twins of the eleven `src/components/subscription/*` sections the two pages
  render, with the same prices, price keys, pack keys, error-code map, code normalisation,
  `?code=` auto-submit and launch-grant dismissal key (`localStorage` → AsyncStorage).
- `data/billing.ts`: native twins of the web reads `useBilling()` (`GET /billing/me`, query key
  `['billing','me']`) and the founding-status read (`GET /billing/founding-status`, every 30 s,
  failure = no banner). The web modules are class B (Supabase client, `import.meta.env`), so they
  are re-implemented on the native gateway client. No core entry is added (wallet-home owns the
  only extraction).
- `data/actions.ts`: every billing write (choose plan, buy credit pack, manage / withdraw via the
  portal, redeem) goes to `BillingActions`. The app default makes **no call**: it shows
  `walletSubscriptionsNative.finishOnWeb` and resolves `null`. `gatewayBillingActions` carries the
  web wire format but is wired nowhere in the app; the tests run it against the fake gateway to
  pin paths and payloads. This matches the sibling wallet-home lane's `WalletActions`.
- `apps/mobile/src/ports/billing.tsx`: the N2 `Accordion*` / `Progress` and the lucide glyphs these
  screens draw, in their own port so the parallel wallet lanes do not edit the same
  `ports/ui.tsx` lines.
- `src/i18n/*/walletSubscriptionsNative.json`: 9 new keys, DE first (du-form), then all 11 locales
  (pt você, fr tu, ru ты, ar). The existing `billing.*` and `common.back` keys are reused.
- `apps/mobile/src/navigation/resolve.ts`: `/profile/subscriptions` and `/wallet/subscriptions`
  added to `NATIVE_ROUTES`.
- `apps/mobile/parity/ledger.json`: `WALLET.SUBSCRIPTIONS` and `/profile/subscriptions` flipped
  `not_started` → `native`.
- `apps/mobile/maestro/wallet-subscriptions/README.md`: the G1 device-runtime flows (deferred).

## iOS IAP: behaviour equals today's (plan decision 3, requirements R3.2)

| Today (web, `origin/main`) | Native twin | Test (`tests/wallet-subscriptions/iap-parity.test.tsx`) |
|---|---|---|
| `Subscriptions.tsx`, `MobileSubscriptions.tsx` and every `src/components/subscription/*` file have no `isIAPRestricted` / `isIOSApp` reference (ungated on iOS) | no platform branch in any lane file | source scan of the web files and of every lane file |
| all sections and CTAs render on iOS | same tree on iOS and Android | rendered testID trees on `Platform.OS = 'ios'` and `'android'` are equal, for free and paid members, on both screens; purchase CTAs present on iOS |
| drawer `iapRestricted: Platform.OS === 'ios'` hides the Wallet row | unchanged | `composeDrawerRows` both ways + source pin on `SideDrawer.tsx` |

No gate is added, removed, widened or narrowed. Subscriptions are recorded as **digital content**
for the owner's decision-5 call (StoreKit / Play Billing or hidden on iOS); that decision is not
made here (`next_actor: owner`).

## No purchase, checkout or subscription call

The app default `BillingActions` makes no call (tests: "the app default BillingActions" — no POST
reaches the gateway, `Linking.openURL` is never called, the `?code=` deep link makes no redeem
call, and only the two GET reads reach the gateway). All tests run on the fake gateway behind the
no-network guard.

## Deviations from the spec (also in the PR body)

1. Billing writes go to `BillingActions`, whose default makes no call (owner instruction for this
   lane: no real purchase, checkout or subscription call). On the web the same buttons open the
   hosted Stripe checkout / portal. The buttons stay visible exactly where the web shows them,
   iOS included. Turning the writes on (`gatewayBillingActions`) is a later wallet FEAT behind
   decision 5 and G1.
2. Text the web hard-codes in English gets catalog keys: the wallet sub-nav labels, the
   billing-interval `aria-label`, the Free plan's "40 min/mo · 1 session" line, and the loading
   label.
3. The web error card shows `error.message` (backend message or `HTTP <status>`). Native shows
   the backend `message` when there is one, otherwise `billing.checkoutErrors.checkoutFailed`, so
   no raw transport string reaches the screen.
4. The web 402 paywall interceptor (`PaywallProvider`) has no native twin yet. None of these
   reads is metered.
5. `YourEarningsWidget` on the web calls a hook after its early return. Native calls it first,
   which renders the same output.
6. The storefront back button falls back to `/home` when there is no history (web `navigate(-1)`).
   Its arrow flips in RTL.

## Commands and results

See `commands.log`, which lists every command and its pass/fail counts.
