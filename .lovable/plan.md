

# Plan: Restore shouldFade Logic for Sticky Buy Ticket Bar

## Desired Flow
1. Drawer opens → green "Buy Ticket" sticky bar is visible and clickable
2. User taps it → scrolls down to ticket section
3. User selects ticket type/quantity in `EventTicketSelector`
4. Green sticky bar fades out (`opacity-0`, `pointer-events-none`)
5. The blue "Buy Tickets" button inside `EventTicketSelector` becomes the active purchase CTA

## What Changed (Previous Fix Was Too Aggressive)
We removed `shouldFade` entirely, making the green bar always visible. The original logic was correct in concept — it just needed to fade based on **ticket selection**, not just **section visibility**.

## New Logic
Instead of fading when the ticket section is merely visible (which broke on mobile where it's visible immediately), fade when the user has **selected at least one ticket** (i.e., `totalTickets > 0` inside the selector).

### Changes

### File 1: `src/components/tickets/EventTicketSelector.tsx`
- Add an optional `onSelectionChange?: (hasSelection: boolean) => void` callback prop
- Call it whenever `totalTickets` changes (via `useEffect`)

### File 2: `src/components/meetups/MeetupDetailsDrawer.tsx`
- Add state: `const [hasTicketSelection, setHasTicketSelection] = useState(false)`
- Pass `onSelectionChange={setHasTicketSelection}` to `EventTicketSelector`
- Restore fade logic on the sticky bar button, but using `hasTicketSelection` instead of `isTicketSectionVisible`:
  ```
  const shouldFade = isTicketCta && hasTicketSelection;
  ```
- Apply `shouldFade && "opacity-0 pointer-events-none"` to button className
- Add `|| shouldFade` back to the `disabled` prop
- Reset `hasTicketSelection` to `false` when drawer closes

## Scope
- 2 files, minimal changes
- No backend/database changes

