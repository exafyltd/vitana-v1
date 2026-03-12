

# Fix 3 iOS/Appilix UX Issues

## Issue 1: Gate `src/components/CreateLiveRoomDialog.tsx`

Import `isIAPRestricted` and wrap the paid toggle, price input, and payment warning sections in `{!isIAPRestricted() && (...)}`. When restricted, only the room name input and "Create Room" button remain — clean free-only flow.

Also guard the `handleCreateRoom` logic so `isPaid` is effectively always `false` when restricted (reset it if somehow set).

**Files**: `src/components/CreateLiveRoomDialog.tsx`

---

## Issue 2: Fix `MobileWalletQuickActions` grid

Change line 91 from fixed `grid-cols-4` to dynamic based on `actions.length`:
- 4 items → `grid-cols-4`  
- 3 items → `grid-cols-3`  
- 2 items → `grid-cols-2`

Use: `` grid-cols-${actions.length} `` won't work with Tailwind purging, so use a simple ternary mapping object or conditional class.

**Files**: `src/components/wallet/mobile/MobileWalletQuickActions.tsx`

---

## Issue 3: Fix dead taps on mobile balance cards in `Wallet.tsx`

When `isIAPRestricted()`:
- **USD card** (`onPress={() => handleWalletAction('add-funds')}`) → change to `onPress={undefined}` (no-op, removes tap affordance)
- **Credits card** (`onPress={() => handleWalletAction('buy-credits')}`) → change to `onPress={undefined}`
- **Tokens card** stays as-is — `stake-tokens` is not a purchase flow

Also update `MobileWalletBalanceCard` to conditionally hide the `ChevronRight` and remove `cursor-pointer` / `active:scale` when `onPress` is undefined/null.

Additionally, on desktop: the `WalletBalanceCard` primary actions for USD ("Add Funds") and Credits ("Buy Credits") should be hidden when restricted. The secondary action "Buy Tokens" on the VTNA card should also be filtered out. These cards are only on desktop but should still be gated.

**Files**: `src/pages/Wallet.tsx`, `src/components/wallet/mobile/MobileWalletBalanceCard.tsx`

---

## Summary of all changes

| File | Change |
|------|--------|
| `src/components/CreateLiveRoomDialog.tsx` | Hide paid toggle + price UI when `isIAPRestricted()` |
| `src/components/wallet/mobile/MobileWalletQuickActions.tsx` | Dynamic grid cols based on filtered action count |
| `src/components/wallet/mobile/MobileWalletBalanceCard.tsx` | Hide chevron + remove tap styles when `onPress` is absent |
| `src/pages/Wallet.tsx` | Remove `onPress` from USD/Credits cards on iOS; filter purchase primary/secondary actions on desktop cards |

