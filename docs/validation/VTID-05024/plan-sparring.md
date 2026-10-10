# Plan: Rewards entry point on the mobile Wallet

<!-- plan:begin -->
## Problem
On phones, `/wallet` (src/pages/Wallet.tsx, `if (isMobile)` branch ~L375) renders its own layout with
three mode pills (Balances / Activity / Actions, `mobileWalletModes` ~L128) and no `SubNavigation`.
Nothing on that layout links to `/wallet/rewards`, so the Rewards screen (earned VTNA, Shop,
Earning Intelligence — src/pages/wallet/Rewards.tsx) is unreachable by tapping on mobile. Desktop
reaches it through `walletNavigation` (src/config/navigation.ts:63).

Separately, the voice screen registry (src/navigation/registry/screens.json) still lists
`WALLET.REWARDS_PENDING` (`/wallet/rewards?tab=pending`) and `WALLET.REWARDS_REFERRAL`
(`?tab=referral`); those tabs were removed in VTID-04983, so Vitana would open a tab that no longer
exists. There is no registry entry for the Shop tab.

## Change class
standard (app repo only; >3 files; no migrations, routes, auth, workflows, deploy or LLM routing).

## Changes (vitana-v1 only)
1. **Mobile Wallet — a fourth pill "Rewards"** (icon 🎁) in `mobileWalletModes`. Selecting it
   navigates to `/wallet/rewards` (the existing screen — one source of content, and the Stripe
   shipping return `/wallet/rewards?tab=shop&shipping=…` keeps working unchanged); the active pill
   does not change to "rewards". **Explicit code change:** the `?tab=` initialiser and `useEffect`
   in Wallet.tsx (~L123-140) are extended so `tab=rewards` calls
   `navigate('/wallet/rewards', { replace: true })` instead of being ignored.
1b. **Rewards.tsx mobile shell** (`useIsMobile()`): on mobile it does not render the desktop
   `SubNavigation` bar; it renders a back link "← Wallet" (`wallet.backToWallet`, i18n) to `/wallet`
   at the top, and uses the same mobile padding as the Wallet mobile layout (`p-4 pb-32`) instead of
   `p-6`. Desktop rendering is unchanged.
2. **Labels** `wallet.tabs.rewards` and `wallet.backToWallet`: DE first ("Belohnungen",
   "Zurück zur Wallet"), EN ("Rewards", "Back to Wallet"), mirrored to all 11 existing
   `src/i18n/*/wallet.json` files (the other 9 (marked `_pending_review` per the existing convention), with i18n source stamps
   for the new key only.
3. **Voice registry**: remove `WALLET.REWARDS_PENDING` and `WALLET.REWARDS_REFERRAL` from
   `screens.json` and from every `locales/<lc>.json`; add `WALLET.REWARDS_SHOP`
   (`/wallet/rewards?tab=shop`, access member) with EN+DE title/shows/phrasings ("open the rewards
   shop", "what can I buy with VTNA" / DE equivalents) and every locale title. `npm test`
   (registry tests) must pass.
4. **iPhone app unchanged**: `Wallet.tsx` and `Rewards.tsx` both redirect to `/home` when
   `isIAPRestricted()` (iOS app) — the wallet stays hidden there until its own launch. This plan
   does not change that; it is flagged to the owner as a separate decision.
5. No What's New entry (navigation fix to an existing screen — owner rule 2026-10-08).

## Out of scope / deferred
- The gateway's committed `nav-registry.snapshot.json` (vitana-platform) still holds the two stale
  ids until it is refreshed by its own process; the gateway reads the published `/nav-registry.json`
  from the app build. Not edited here.
- Showing the wallet in the iPhone app (owner decision).

## Tests
- Vitest `src/pages/__tests__/wallet-mobile-rewards-pill.test.tsx` (or next to Wallet): with
  `useIsMobile` mocked true, the Rewards pill renders; tapping it navigates to `/wallet/rewards`;
  `/wallet?tab=rewards` navigates there too (replace); Balances/Activity/Actions still present.
  Rewards.tsx with `useIsMobile` true: no SubNavigation, back link to `/wallet`; false: SubNavigation
  present (desktop unchanged).
- Registry tests (`registry.test.ts`, `registry.routes.test.ts`, `build-nav-registry.test.ts`)
  green; an assertion that no registry route uses `tab=pending|referral` on `/wallet/rewards` and
  that every `/wallet/rewards?tab=X` is one of earned|shop|intelligence (the bare `/wallet/rewards`
  route of `WALLET.REWARDS` is allowed; it defaults to earned).
- i18n stamp/leak tests, lint, typecheck, build.
- Staging (read-only) Playwright spec `tests/e2e/staging/<VTID>-mobile-wallet-rewards.staging.spec.ts`:
  390x844 viewport, sign in, open `/wallet`, tap the Rewards pill, assert URL `/wallet/rewards` and the
  Shop tab trigger and the back link are visible and the desktop SubNavigation is not; GET only. Listed in `docs/validation/<VTID>/staging-tests.json`.
- Screenshots (mobile 390x844, desktop 1400x900) of the wallet with the new pill and the landing
  screen, from a local build against staging gateway, read-only.

## Files in scope
src/pages/Wallet.tsx; src/pages/wallet/Rewards.tsx; src/i18n/*/wallet.json (+ i18n-source-stamps); src/navigation/registry/screens.json;
src/navigation/registry/locales/*.json; a registry test addition; the new Vitest file; the staging
spec; docs/validation/<VTID>/*; docs/SCREEN_INVENTORY.md (regenerated).
<!-- plan:end -->


## Round 1 — planner responses
- F1 [major] mobile layout break → ACCEPTED (option b+c): Rewards.tsx gets a mobile branch — no
  SubNavigation, a "← Wallet" back link, mobile padding (plan item 1b). Inline rendering (option a)
  considered and not chosen: it would duplicate the three tabs' content in Wallet.tsx (already a
  ~800-line hotspot) and the Stripe shipping return URL from the gateway
  (`/wallet/rewards?tab=shop&shipping=…`, reward-shop.ts:170) would still land on Rewards.tsx, so
  that page needs a usable mobile shell either way.
- F2 [major] `?tab=rewards` handler → ACCEPTED: now an explicit code change in item 1 and tested.
- F3 [minor] locale wording → ACCEPTED: "all 11 existing wallet.json files".
- F4 [minor] base route in the assertion → ACCEPTED: assertion text allows the bare route.
- F5 [minor] REWARDS_EARNED entry → REJECTED: `WALLET.REWARDS` (bare route, defaults to the earned
  tab, Rewards.tsx:21) already serves "show my earned rewards"; a second entry for the same screen
  would split the intent between two ids with identical landing.

## Round 2 — partner disposition
F1 closed, F2 closed, F3 closed, F4 closed, F5 acknowledged. No new blockers or majors.
Verdict: CONVERGED (2 rounds, standard class).

## Owner approval
APPROVED by owner in Claude Code session 2026-10-10 ("Yes") — plan hash ca3c4d5fd08974dace54e5117f60036d3febd67c7fd2d89444cc8fb6328f7566

VTID: VTID-05024 (allocated after approval; `<VTID>` in the plan body refers to it — left verbatim so the hash matches).
