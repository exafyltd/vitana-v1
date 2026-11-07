# Verification — VTID-05425 (native-wave2-wallet-r2 / wallet-subscriptions)

Native Wave 2 wallet-subscriptions lane: the `/wallet/subscriptions` overview and the
`/profile/subscriptions` storefront. All commands ran offline in the Linux worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-wallet-r2-wallet-subscriptions`, base
`origin/main` `a41e89a0d`; fix 1 merged `origin/main` `ec8682fec`. The native app has no production profile; `assertNotProduction()`
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
  portal, redeem) goes to `BillingActions`, whose app default is `gatewayBillingActions`: the web
  `src/lib/billingApi.ts` requests on the native gateway client (`POST /billing/checkout/subscription`
  `{price_key}`, `POST /billing/checkout/credits` `{pack_key}`, `POST /billing/portal` with no body,
  `POST /billing/redeem` `{code}`, JSON). A returned hosted Stripe URL is opened in the
  in-app browser (expo-web-browser `openBrowserAsync`, `useOpenBillingUrl`), where the web assigns
  `window.location` / `window.open`; the return leg refreshes billing/me (fix 2, below).
  The plan names no surface where the web defers a billing write, so no deferred variant is kept.
- `apps/mobile/src/ports/billing.tsx`: the N2 `Accordion*` / `Progress` and the lucide glyphs these
  screens draw, in their own port so the parallel wallet lanes do not edit the same
  `ports/ui.tsx` lines.
- `src/i18n/*/walletSubscriptionsNative.json`: 8 new keys, DE first (du-form), then all 11 locales
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

## Billing writes (fix 1)

The shipped screens make the web's billing requests. `tests/wallet-subscriptions/billing-requests.test.tsx`
asserts them against the fake gateway: the four request builders (path, method, JSON body,
`Content-Type`), and the app default `BillingActions` with no provider injected (Choose, Buy,
larger-plan Choose, Redeem, Manage, Withdraw and the `?code=` deep link post the web requests and
hand the hosted URL to the system; since fix 2 the spied expo-web-browser `openBrowserAsync`). Red on the previous head: `red-fix1.txt`
(3 app-default tests failed, 4 builder tests passed). The earlier "app default makes no call"
tests asserted the misread behaviour and were replaced by these; the "only GET reads on render"
test is kept. The IAP tests (`iap-parity.test.tsx`) are unchanged. All tests run on the fake
gateway behind the no-network guard; no test and no verification command calls a live endpoint.

## Return leg after a hosted billing page (fix 2)

The gateway's Stripe success / cancel URLs are web URLs
(`/wallet/subscriptions?checkout=success&session_id=…` / `?checkout=cancelled`; the credits
success URL is `/wallet?credits_purchased=true`; the portal returns to `/wallet/subscriptions`).
On the web the page loads `/billing/me` fresh on that return and shows the refreshed plan card; it
reads no `checkout` param and shows no toast for success or cancel. Native now matches that:

- `useOpenBillingUrl` (data/billing.ts) opens the URL with expo-web-browser (already on main,
  57.0.3; no package.json / lock / app.config change) and marks an external flow pending, keyed to
  the QueryClient, with the plan + credits as they were.
- `useBillingReturnLeg`, mounted by both screens: when the in-app browser closes (iOS `cancel` /
  `dismiss`), on AppState `active` and on screen focus while a flow is pending, it invalidates
  `BILLING_ME_KEY` (refetching the active query) and polls up to 5 reads, 2 s apart, stopping as
  soon as the plan or credits change; the flow closes afterwards.
- `/wallet/subscriptions` reads `checkout` with `useLocalSearchParams`: `success` refreshes with
  the poll, `cancelled` reads billing/me once and closes the flow (old plan, no toast, as on the
  web).

Tests: `tests/wallet-subscriptions/return-leg.test.tsx` (fakes only: fake gateway, stubbed
expo-web-browser, captured AppState listeners). Red on the previous head 849523c: `red-fix2.txt`
(5 failed, the "nothing pending" guard passed). The existing Linking spy became the
expo-web-browser spy with the same URL assertions; no assertion was loosened. iOS IAP gates are
unchanged.

## Deviations from the spec (also in the PR body)

1. Text the web hard-codes in English gets catalog keys: the wallet sub-nav labels, the
   billing-interval `aria-label`, the Free plan's "40 min/mo · 1 session" line, and the loading
   label.
2. The web error card shows `error.message` (backend message or `HTTP <status>`). Native shows
   the backend `message` when there is one, otherwise `billing.checkoutErrors.checkoutFailed`, so
   no raw transport string reaches the screen.
3. The web 402 paywall interceptor (`PaywallProvider`) has no native twin yet. None of these
   reads is metered.
4. `YourEarningsWidget` on the web calls a hook after its early return. Native calls it first,
   which renders the same output.
5. The storefront back button falls back to `/home` when there is no history (web `navigate(-1)`).
   Its arrow flips in RTL.

## Commands and results

See `commands.log`, which lists every command and its pass/fail counts.
