

# Plan: Fix Stripe Checkout Popup Being Blocked

## Problem
The edge function returns a valid URL (confirmed by network logs showing 200 with a Stripe checkout URL), but `window.open()` is being blocked by the browser's popup blocker. Browsers block `window.open()` when it's not called in the direct call stack of a user gesture — and here, the `window.open()` happens after an async `await` (the edge function call), breaking the user-gesture chain.

## Solution
Pre-open the popup window **before** the async call (while still in the user-gesture call stack), then redirect it to the Stripe URL once the response arrives. If the call fails, close the pre-opened window.

### File: `src/hooks/useEventTickets.ts` (~lines 195-227)

```typescript
// Pre-open popup BEFORE the async call (preserves user gesture context)
const isMobile = window.innerWidth < 768;
let popupWindow: Window | null = null;
if (!isMobile) {
  const width = 500;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  popupWindow = window.open('about:blank', 'stripe-checkout', 
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
}

const response = await supabase.functions.invoke("stripe-create-ticket-checkout", { ... });

if (response.error) {
  popupWindow?.close();
  throw new Error(response.error.message || "Failed to create checkout");
}

const { url } = response.data;
if (url) {
  if (isMobile) {
    window.location.href = url;
  } else if (popupWindow) {
    popupWindow.location.href = url;
  } else {
    // Fallback if popup was still blocked
    window.location.href = url;
  }
}
```

## Scope
- 1 file changed (`src/hooks/useEventTickets.ts`)
- No backend changes

