
## Fix plan

### Root cause
The bottom-nav hide rule already exists, but it is not firing consistently because `MeetupDetailsDrawer` relies on an `isMobile` prop that is omitted in some routes.

I found:
- `src/pages/Home.tsx` — renders `<MeetupDetailsDrawer ... />` without `isMobile`
- `src/pages/Community.tsx` — same
- `src/pages/community/Meetups2.tsx` — same
- `src/pages/community/Events.tsx` and `EventsAndMeetups.tsx` do pass `isMobile`

So on pages that omit the prop, the drawer falls back to `isMobile = false`, which means:
- `data-drawer-open="true"` is never set on `<body>`
- the existing CSS rule to hide `.mobile-bottom-nav` never activates
- the Buy Ticket bar cannot occupy that space because the nav is still mounted underneath

### Implementation
1. **Make mobile detection internal in `MeetupDetailsDrawer`**
   - Import `useIsMobile`
   - Change the prop to optional
   - Derive `const effectiveIsMobile = isMobileProp ?? useIsMobile()`

2. **Use `effectiveIsMobile` everywhere in the drawer**
   Replace all viewport branching that currently uses `isMobile`, including:
   - body `data-drawer-open` effect
   - scroll restore effect
   - mobile/desktop close buttons
   - hero/action-bar/mobile styling
   - final `Sheet` vs `Drawer` render path

3. **Keep the existing bottom-nav suppression as-is**
   No new CSS should be needed if the body attribute is finally set reliably:
   - `src/index.css` already has `body[data-drawer-open="true"] .mobile-bottom-nav { display: none !important; }`
   - `MobileBottomNav` already has the `mobile-bottom-nav` class

### Why this should fix it
The issue is not mainly the Buy Ticket bar styling anymore; it is that the drawer’s “I am open on mobile” signal is not consistently reaching the page. Once that signal is fixed, the bottom nav should actually disappear, and the existing Buy Ticket bar should sit in that space as intended.

### Files to update
- `src/components/meetups/MeetupDetailsDrawer.tsx`

### Technical notes
- This is safer than patching multiple pages individually because it fixes every current and future caller.
- Desktop behavior stays unchanged because the component still uses the desktop drawer whenever `effectiveIsMobile` is false.
- After implementation, verify on the routes with inconsistent usage first: Home, Community, and Meetups.
