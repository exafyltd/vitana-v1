

## iOS/Appilix Purchase Restriction — Audit Results

### Already Gated (Confirmed Working)

| Feature | File | Method |
|---|---|---|
| Gift Voucher button | `utility-action-button.tsx` | `isIAPRestricted()` hides button + modal |
| Add Funds popup | `AddFundsPopup.tsx` | Returns `null` |
| Buy Credits popup | `BuyCreditsPopup.tsx` | Returns `null` |
| Buy Tokens popup | `BuyTokensPopup.tsx` | Returns `null` |
| Add Funds quick action (mobile) | `MobileWalletQuickActions.tsx` | Filtered via `restrictedIds` |
| Buy Credits quick action (mobile) | `MobileWalletQuickActions.tsx` | Filtered via `restrictedIds` |
| Buy Tokens quick action (mobile) | `MobileWalletQuickActions.tsx` | Filtered via `restrictedIds` (recently added) |
| Wallet promo cards (desktop) | `Wallet.tsx` line 783 | `!isIAPRestricted()` wraps entire block |
| USD balance card tap (mobile) | `Wallet.tsx` line 392 | `onPress` set to `undefined` |
| Credits balance card tap (mobile) | `Wallet.tsx` line 403 | `onPress` set to `undefined` |
| Paid room creation (both dialogs) | `CreateLiveRoomDialog.tsx` (×2) | Access level / paid toggle hidden |
| Paid room purchase dialog | `PurchaseRoomAccessDialog.tsx` | Returns `null` |
| Desktop USD card "Add Funds" primary action | `Wallet.tsx` line 562 | `isIAPRestricted() ? undefined` |
| Desktop Credits card "Buy Credits" primary action | `Wallet.tsx` line 604 | `isIAPRestricted() ? undefined` |
| Desktop "Buy Tokens" secondary action | `Wallet.tsx` line 527 | Filtered from array |
| Balance page contextual actions | `Balance.tsx` line 80 | Returns `null` (Top Up, Buy/Stake, Upgrade) |

### Remaining Gaps Found

| # | Issue | File | Risk |
|---|---|---|---|
| 1 | **"Stake Tokens" primary action on desktop VTNA card** — not gated | `Wallet.tsx` line 520-525 | Medium — "Stake Tokens" button visible; leads to `StakeTokensPopup` which has no `isIAPRestricted()` check |
| 2 | **"Stake Tokens" on mobile VTNA balance card** — `onPress` not gated | `Wallet.tsx` line 414 | Medium — tappable, opens StakeTokensPopup |
| 3 | **`StakeTokensPopup` itself** — no iOS gate | `StakeTokensPopup.tsx` | Medium — if reached, full staking UI with amounts is visible |
| 4 | **`BillingActionPopup` "Upgrade Plan" tab** — shows $19.99/mo and $49.99/mo pricing with "Upgrade Now" buttons | `BillingActionPopup.tsx` lines 58-64, 127-175 | High — explicit pricing and purchase CTA visible on Settings > Billing |
| 5 | **`BillingActionPopup` "Add Payment" tab** — "Add Payment Method" button | `BillingActionPopup.tsx` lines 95-124 | Medium — implies digital purchases |

### Proposed Fixes

**1. `StakeTokensPopup.tsx`** — Add early return: `if (isIAPRestricted()) return null;`

**2. `Wallet.tsx`** — Gate the desktop VTNA card's "Stake Tokens" primary action with `isIAPRestricted() ? undefined : { ... }` (line 520). Gate mobile VTNA balance card `onPress` with `isIAPRestricted() ? undefined : ...` (line 414).

**3. `BillingActionPopup.tsx`** — Gate "Upgrade Plan" and "Add Payment" tabs: hide these buttons from the quick actions grid when `isIAPRestricted()`, and hide the tab content. Alternatively, add `if (isIAPRestricted()) return null;` at the top if the entire popup is purchase-oriented.

### Items That Are Safe (No Change Needed)

- **Staking** is borderline — it's not a "purchase" but involves digital token manipulation. Recommend hiding on iOS to be safe since Apple may interpret it as a digital goods transaction.
- **"Send", "Request", "Exchange", "Withdraw"** — These are peer-to-peer transfers/withdrawals of existing balances, not purchases. Apple doesn't restrict these.
- **Package purchases** (`PackagePurchaseSuccess.tsx`) — These appear to be for physical/service packages (business packages with items), which are exempt from IAP rules. No gate needed unless they're purely digital.
- **Membership tab label** in Balance.tsx ("Membership Benefits") — Just a label showing benefits info, the action button is already gated. Safe.

### Layout / Dead Tap Check

- Mobile VTNA balance card: currently tappable (opens Stake Tokens) — will become static with the fix. No empty space since the card still shows balance info.
- Desktop VTNA card: "Stake Tokens" button removed, but "Send", "Request", "Exchange" secondary actions remain. No empty card.
- `MobileWalletQuickActions`: with 3 purchase items filtered, remaining actions are Send, Exchange, Withdraw (3 items in a 3-column grid). Layout intact.

### Summary

5 gaps to fix across 3 files. All changes are iOS-only via `isIAPRestricted()`. Android and web remain completely unaffected.

