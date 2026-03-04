

# Plan: Stripe Checkout as Popup Window on Desktop

## Problem
Currently, Stripe checkout always uses `window.location.href = url` which navigates away from the app. The user wants desktop to open Stripe in a popup window (like it was before), while keeping mobile as a full redirect.

## Changes

### File: `src/hooks/useEventTickets.ts` (lines 215-218)

Replace the `window.location.href = url` redirect with a desktop/mobile check:

- **Desktop** (viewport >= 768px): Use `window.open(url, '_blank', 'width=600,height=700,...')` to open Stripe Checkout in a centered popup window
- **Mobile** (viewport < 768px): Keep `window.location.href = url` as-is

```typescript
const { url } = response.data;
if (url) {
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    window.location.href = url;
  } else {
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(url, 'stripe-checkout', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
  }
}
```

## Scope
- 1 file, ~10 lines changed
- No backend or database changes
- Mobile behavior unchanged

