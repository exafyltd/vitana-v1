

# Hide Discount Code After Successful Use

## Problem

The `useDiscountCode` hook correctly filters out used codes on page load, so returning users won't see the discount field. However, within the same browser session after a successful checkout, the banner and input remain visible until a manual refresh.

## Solution

After a successful purchase with a discount code, immediately clear the discount UI state so it disappears without requiring a page reload.

## Changes

### 1. `EventTicketSelector.tsx`

- After `handlePurchase` succeeds (the `purchaseTicket` call resolves without error), if `appliedCode` was set:
  - Clear `appliedCode` to `null`
  - Clear `appliedPercent` to `0`
  - This removes both the green "applied" badge and the input field from the UI

### 2. `useDiscountCode.ts`

- Export a `clearDiscount` function from the hook that sets `discountCode` to `null`
- Call it from `EventTicketSelector` after successful purchase so the auto-detect banner also disappears

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useDiscountCode.ts` | Add `clearDiscount` method to return value |
| `src/components/tickets/EventTicketSelector.tsx` | Call `clearDiscount()` + reset local state after successful purchase |

## Result

- After checkout with a discount code, the discount section vanishes immediately
- On next visit, the hook query returns nothing (code is marked used in DB by the webhook)
- Manual entry field still available for users without auto-detected codes (until they use one)
