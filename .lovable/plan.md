

# Integrate Discount Code into Ticket Purchase Flow

## Overview

Wire the existing `DiscountCodeInput` component and `useDiscountCode` hook into `EventTicketSelector` so Maxina users see their available discount and can apply it (one-tap or manual entry) before checkout.

## Changes

### 1. `EventTicketSelector.tsx` -- Main integration point

- Import `DiscountCodeInput` and `useDiscountCode`
- Add state: `appliedCode: string | null`
- **Auto-detect banner**: If `useDiscountCode('maxina')` returns an unused code, show a styled banner:
  `"Gift Welcome discount available: MAXINA-ABC123 (10%)"` with a one-tap "Apply" button
- **Manual entry**: Always render `DiscountCodeInput` below the ticket list (collapsed under the banner if auto-detected code is shown)
- **Validation (`onApply`)**: Query `user_discount_codes` to check: code exists, matches tenant, not expired, not used. Return `{ valid, message }`
- **On checkout**: Pass `appliedCode` as the 7th argument to `purchaseTicket()`
- **Price display**: When discount is applied, show original price struck through + discounted total

### 2. `useEventTickets.ts` -- Already wired

The `purchaseTicket` function already accepts `discountCode` as the 7th parameter and passes it to `stripe-create-ticket-checkout`. No changes needed here.

### 3. Translation keys (`en.json` / `de.json`)

Add:
| Key | English | German |
|-----|---------|--------|
| `discount.bannerAvailable` | Welcome discount available | Willkommensrabatt verfuegbar |
| `discount.tapToApply` | Apply | Anwenden |
| `discount.discountAppliedAmount` | 10% discount applied | 10% Rabatt angewendet |
| `discount.remove` | Remove | Entfernen |

### 4. Hardcoded string cleanup in `EventTicketSelector.tsx`

While editing, replace existing hardcoded strings with translation keys:
- "Select Tickets", "Sold Out", "Sales ended", "Free", etc. -- these already partially use `translate()` but a few are still hardcoded

## Files Changed

| File | Action |
|------|--------|
| `src/components/tickets/EventTicketSelector.tsx` | Add discount state, banner, DiscountCodeInput, pass code to checkout |
| `src/i18n/en.json` | Add 4 discount banner keys |
| `src/i18n/de.json` | Add 4 discount banner keys |

## UX Flow

1. User opens ticket purchase drawer/section
2. If logged-in Maxina user with unused code: banner appears with code + "Apply" button
3. User taps "Apply" -- code validates, success badge shows with "Remove" action
4. User can also type a code manually in the input field below
5. Total price updates to show discount (strikethrough original + new total)
6. On "Buy Tickets" click, the applied code passes through to Stripe checkout
7. After successful payment, webhook marks code as used

