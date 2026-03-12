
Goal: Keep the Events & Meet-Ups top area (title + controls) visible and stable after closing the event drawer on mobile, so the screen always returns to the same “first screenshot” state.

1) Root cause I’ll address
- The previous fix restores `window.scrollY` inside `MeetupDetailsDrawer`, but this page (`/comm/events-meetups`) primarily scrolls inside internal containers, not the window.
- After drawer close, restoring window scroll can still leave the page visually shifted up, which hides/crops the title area (exactly what your second screenshot shows).
- The page header block itself is not sticky, so when this shift happens, the title is the first thing to disappear.

2) Implementation plan (focused and minimal-risk)
- Make the full mobile top block sticky in `src/pages/community/EventsAndMeetups.tsx`:
  - StandardHeader (title/description)
  - Utility action row (Search/Calendar/Create/Gift/Autopilot pills)
  - Tab row (Hot/Upcoming/Today/Following)
- Use the same proven mobile offset pattern already used in Orders:
  - `top-[calc(env(safe-area-inset-top,0px)+32px)]`
- Keep desktop layout unchanged.

3) Stabilize drawer close behavior for this page
- Add a drawer prop to control scroll restoration behavior (default unchanged for other pages):
  - In `src/components/meetups/MeetupDetailsDrawer.tsx`, guard the current save/restore effect behind a prop (e.g. `restoreWindowScrollOnClose = true`).
- For `EventsAndMeetups`, pass `restoreWindowScrollOnClose={false}` to stop forcing window scroll restoration where it’s not appropriate.
- On mobile drawer close in `EventsAndMeetups`, normalize to top (`window.scrollTo(0, 0)`) as a safety net so the title region is always visible.

4) Files to update
- `src/pages/community/EventsAndMeetups.tsx`
  - Restructure mobile layout so header/actions/tabs are one sticky block.
  - Keep tab contents below in a dedicated scrollable region.
  - Pass `restoreWindowScrollOnClose={false}` to `MeetupDetailsDrawer`.
  - Add mobile close normalization in `handleDrawerClose`.
- `src/components/meetups/MeetupDetailsDrawer.tsx`
  - Add optional prop to enable/disable window scroll restore on close.
  - Preserve existing default behavior for other pages (no regression risk).

5) Technical notes
- Sticky header top offset:
  - Reuse existing app standard: below fixed `TopAppBar` + safe area.
- Z-index/background:
  - Sticky container will include backdrop/background so event cards do not bleed through while scrolling.
- Scope control:
  - Desktop and non-events pages remain unchanged unless they opt into the new prop.

6) Validation checklist
- Open any event from Hot/Upcoming/Today, close with X, verify title remains visible.
- Repeat after scrolling deep in carousel.
- Repeat across multiple events (“no matter what event we are at”).
- Confirm no regression on Home/Community pages that also use `MeetupDetailsDrawer`.
