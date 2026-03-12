

# iOS/Appilix Digital Purchase Restriction — Implementation Plan

## Kill Switch Design

Add a single function `isIAPRestricted()` in `src/lib/appilix.ts` that returns `isAppilix()`. This is **not** a temporary toggle — it stays `true` on iOS until a compliant IAP solution is built. To re-enable, the function body must be explicitly changed.

```ts
/** iOS App Store Guideline 3.1.1 compliance gate.
 *  Returns true when digital purchases must be hidden.
 *  Will remain true on iOS until a compliant IAP solution is implemented. */
export function isIAPRestricted(): boolean {
  return isAppilix();
}
```

---

## Components to Change (8 files)

### 1. `src/lib/appilix.ts`
Add the `isIAPRestricted()` export.

### 2. `src/components/ui/utility-action-button.tsx`
Import `isIAPRestricted`. Force `hideGiftVoucher = true` when restricted. This auto-hides the Gift Voucher button and modal on **every page** that uses `UtilityActionButton`.

### 3. `src/components/wallet/mobile/MobileWalletQuickActions.tsx`
Import `isIAPRestricted`. When restricted, filter out `add-funds` and `buy-credits` actions from both primary and secondary action arrays.

### 4. `src/components/wallet/popups/AddFundsPopup.tsx`
Import `isIAPRestricted`. If restricted and `open` is true, render nothing (early return `null`). Safety net in case the popup is triggered programmatically.

### 5. `src/components/wallet/popups/BuyCreditsPopup.tsx`
Same treatment — early return `null` when restricted.

### 6. `src/components/wallet/popups/BuyTokensPopup.tsx`
Same treatment — early return `null` when restricted (buying VTNA tokens with USD is a digital purchase).

### 7. `src/components/liverooms/CreateLiveRoomDialog.tsx`
When restricted: hide the "Paid (Group)" radio option entirely. Only "Free (Public)" remains. Price input never appears.

### 8. `src/components/liverooms/PurchaseRoomAccessDialog.tsx`
When restricted: early return `null` for the dialog content. Paid room access purchase is blocked entirely on iOS — no "Buy on Website" fallback.

---

## What About Event Tickets and Booking Payments?

**Event Tickets (`EventTicketSelector.tsx`)** — These are for real-world, in-person meetup events with physical locations and dates. This qualifies for the Apple exemption for "tickets to real-world events." **Keep visible on iOS.**

**Booking Payment (`BookingPaymentFlow.tsx`)** — This is for booking real-world services (doctors, coaches) with physical appointments. Also exempt as a real-world service. **Keep visible on iOS.**

---

## Summary

| Purchase Flow | iOS Status | Reason |
|---|---|---|
| Gift Voucher (all pages) | **HIDDEN** | Digital good |
| Add Funds (wallet) | **HIDDEN** | Digital currency/credits |
| Buy Credits (wallet) | **HIDDEN** | Digital currency |
| Buy Tokens/VTNA (wallet) | **HIDDEN** | Digital currency |
| Paid Live Room creation | **HIDDEN** (forced free-only) | Digital access |
| Paid Room access purchase | **HIDDEN** | Digital access |
| Event Tickets | **VISIBLE** | Real-world physical events |
| Service Bookings | **VISIBLE** | Real-world services |

**Post-approval**: These restrictions remain active on iOS. Re-enabling requires either implementing Apple IAP or explicitly changing `isIAPRestricted()` after determining a compliant approach.

