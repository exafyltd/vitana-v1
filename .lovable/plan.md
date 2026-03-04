

# Plan: Fix "Buy Ticket" Sticky Bar Being Inactive in Drawer

## Problem
The sticky "Buy Ticket" bar in the MeetupDetailsDrawer becomes invisible and disabled when the ticket section is visible on screen. This is caused by the `shouldFade` logic:

```typescript
const shouldFade = isTicketCta && isTicketSectionVisible;
// Results in: opacity-0, pointer-events-none, disabled=true
```

On mobile, the ticket section can be visible as soon as the drawer opens (or after scrolling), making the sticky bar completely disappear. The user sees "Buy Ticket" briefly, then it fades to invisible — appearing broken.

Additionally, the sticky bar button only scrolls to the ticket section; it does not directly purchase. This two-step flow (tap sticky bar → scroll → select quantity → tap Buy Tickets) is confusing.

## Changes

### File: `src/components/meetups/MeetupDetailsDrawer.tsx`

1. **Remove the fade-out behavior** for the sticky Buy Ticket bar. Instead of hiding it when the ticket section is visible, keep it always visible but change its behavior:
   - When ticket section is NOT visible: scroll to it (current behavior)
   - When ticket section IS visible: auto-select 1 ticket of the cheapest type and scroll to the Buy Tickets submit button

2. **Remove `shouldFade` from the disabled prop** so the button is never disabled just because tickets are on screen

3. **Keep the visual styling** (gradient green/teal) regardless of ticket section visibility

Specifically:
- Line ~1492: Remove `const shouldFade = isTicketCta && isTicketSectionVisible;`
- Line ~1496-1499: Remove `shouldFade && "opacity-0 pointer-events-none"` from className
- Line ~1503: Remove `|| shouldFade` from disabled prop
- The button always remains visible and functional in the sticky bar

## Scope
- 1 file modified: `MeetupDetailsDrawer.tsx`
- ~5 lines changed
- No backend/edge function changes
- No database changes

