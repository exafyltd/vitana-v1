

# Plan: Fix Gray "Buy Ticket" Button on Drawer Open

## Root Cause

`isCheckingParticipation` is initialized to `true` (line 187) and stays true until the async Supabase query completes. This makes the button `disabled`, which triggers shadcn's default `disabled:opacity-50` styling — turning the green gradient gray.

## Solution

For ticket CTA buttons specifically, we should NOT pass `isCheckingParticipation` to the `disabled` prop. The ticket button's primary action is just scrolling to the ticket section — it doesn't need participation status to be resolved. The participation check only matters for join/leave actions.

### File: `src/components/meetups/MeetupDetailsDrawer.tsx`

**Line ~1504** — Change the `disabled` prop logic:

```typescript
// Before:
disabled={ctaConfig.disabled || isJoining || isCheckingParticipation || shouldFade}

// After:
disabled={ctaConfig.disabled || isJoining || (!isTicketCta && isCheckingParticipation) || shouldFade}
```

This ensures:
- Ticket CTA buttons are immediately green and clickable when the drawer opens
- Non-ticket CTAs (join/leave) still wait for participation check before becoming active
- The fade logic still works when user selects tickets

## Scope
- 1 file, 1 line changed
- No backend/database changes

