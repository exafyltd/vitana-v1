# Verification — VTID-05423 (native-wave2-wallet-r2 / wallet-redeem)

Native Wave 2 wallet-redeem lane: the public voucher-redeem port `/redeem?voucher=<code>`
(1 ledger row, the exclusion route `/redeem`). All commands run offline (the native app has no
production profile; `assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-wallet-r2-wallet-redeem`, base `origin/main`
514e06a8. Every command and its counts: `commands.log`.

## What was built

- `apps/mobile/app/(public)/redeem.tsx` — the route, in the `(public)` group (plan decision 2a,
  sparring R1-F1): `Stack`, `headerShown: false`, no shell chrome, no auth, next to the native
  `/reset-password` and `/logout` twins. Never under `app/(app)/`.
- `apps/mobile/src/screens/wallet-redeem/data/vouchers.ts` — the class-B `useRedeemVoucher.ts`
  re-implemented over the app's one Supabase client (requirements R4.2), same calls as the web:
  lookup `vouchers.select('*').eq('code', CODE.toUpperCase()).maybeSingle()` (errors fall
  through, like the web try/catch), the legacy fallback `vouchers.select('*')` matched on the
  first 8 id characters, then `voucher_orders.select('id, buyer_name, buyer_email, amount_cents,
  currency, created_at').eq('voucher_id', id).maybeSingle()`; claim
  `vouchers.update({ status: 'redeemed', redeemed_by_user_id, redeemed_at }).eq('id', voucherId)
  .eq('status', 'active').select().single()`. Same query key `['voucher-by-code', code]`,
  `enabled: !!code`, 60 s stale time and the same three invalidations
  (`voucher-by-code`, `my-vouchers`, `redeemable-vouchers`).
- `RedeemScreen.tsx` — 1:1 port of the phone branch of `RedeemVoucher.tsx`, states in the web's
  order: no code → Invalid link; auth / voucher loading → form skeleton + "Loading your gift
  voucher…"; lookup error / no voucher → Voucher not found; `status === 'redeemed'` → Already
  redeemed; past `expires_at` → Voucher expired; claimed here → Voucher claimed! (View wallet →
  `/wallet`, Browse events → `/comm/events-meetups`); signed out → landing; signed in → confirm.
  "Go to MAXINA" → `/maxina`.
- `Redemption.tsx` — `RedemptionLanding` (gift header, From <buyer>, tier badge, € value, code,
  "What's included", Sign in to redeem → `/maxina?redirectTo=%2Fredeem%3Fvoucher%3D<code>`,
  Create account → same + `&mode=register`, Events / Community / Wellness row, Powered by MAXINA)
  and `RedemptionConfirm` (card, Gift from <buyer>, "What you'll get", the error box, Claim voucher
  with the Claiming… busy state, "The voucher will be added to your wallet").
- `tiers.ts` — the web `TIER_CONFIG` / `TIER_NAMES` (test / experience / exclusive; unknown tier →
  raw name and the experience benefits), value through `Intl.NumberFormat` in EUR.
- `apps/mobile/src/ports/wallet-redeem.tsx` — the lucide glyphs, `withAlpha`,
  `useButtonForeground`; screens read `@vitana/*` only through ports.
- `/redeem` added to `NATIVE_ROUTES`; the ledger row `/redeem` → `native` (owner kiro);
  `parity-ledger --sync` changes nothing else.
- i18n: `src/i18n/<11 locales>/walletRedeemNative.json` (16 keys, DE first, EN = the web's exact
  English). Every other string reuses the existing web keys `screens.redeemvoucher.*` /
  `screens.voucher.*`.

## iOS IAP gates (requirements R3)

Unchanged. `RedeemVoucher.tsx` imports no `isIAPRestricted` (a code claim, not a purchase), so the
native screen has no gate; the drawer's wallet gate (`src/shell/logic/drawer.ts` `iapRestricted`,
`SideDrawer` `Platform.OS === 'ios'`) is untouched. Tested both ways in
`tests/wallet-redeem/route-gate-i18n.test.tsx`: the landing and the claim work with
`Platform.OS` `ios` and `android`; the redeem files reference no IAP gate; the drawer hides the
wallet row when `iapRestricted` and shows it when not.

## Tests (fake Supabase, built requests asserted, no network)

`tests/wallet-redeem/redeem.test.tsx` (15) + `route-gate-i18n.test.tsx` (29) = 44 tests: code
valid (landing, confirm, claim + update request, claiming state, invalidation refetch), invalid
(no code, unknown code), already claimed, expired, error (lookup error, claim error), renders
without an authenticated session, route file in `(public)`, ledger row, IAP gates both ways,
11 locales with no unresolved key, DE and AR catalogs, key / placeholder parity, RTL-safe styles.
Red on base: `red-on-base.txt`.

## Deviations from the web (recorded, not behaviour changes)

- The web's English hardcoded strings (tier names, benefits, the "wellness" fallback, the claim
  error "Failed to claim voucher. It may have already been redeemed.") are catalog keys; English
  keeps the exact words, the other ten locales are translated.
- The voucher value uses the locale's number format (`49,00 €` in German); the web prints
  `€49.00` in every locale. Currency stays EUR, as on the web.
- The `canvas-confetti` burst after a claim is not ported (a web canvas effect with no kit or
  token equivalent); the success state is identical.
- The MAXINA logo image is the catalog wordmark `walletRedeemNative.brand` (the native app has
  no logo asset); same place, same alt text.
- The desktop Spotlight branch (`inApp`, `AppLayout` + `ScreenFrame`) is not ported: the phone
  branch is the parity target (requirements R1.1).

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`;
`apps/mobile/maestro/wallet-redeem/README.md`). No voucher is claimed on staging or production.
