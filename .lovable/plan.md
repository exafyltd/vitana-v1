
## Goal
Fix the new mobile layout regressions in the full-screen event details view:
1) Remove the new white gap at the top (content should sit higher again).
2) Ensure the Orb/Mute button stays on the “behind” (initial list) layer when event details are open, so it does not cover the X close button.
3) Keep the X clearly tappable in the top-right.

---

## What’s happening now (root causes)
### A) White space at the top
In `MeetupDetailsDrawer.tsx` we added `pt-14` and `min-h-[45vh]` on the hero container for mobile:
```tsx
isMobile ? "pt-14 min-h-[45vh]" : "aspect-video"
```
That padding pushes the hero down, creating the visible “blank” area above the image.

### B) Mute (Orb) covering the X
We also added logic to elevate the Orb above the sheet:
- `MeetupDetailsDrawer.tsx` adds `body.event-detail-sheet-open`
- `index.css` bumps Orb to `z-index: 60`

This makes the Orb float above the event details sheet (and above the X), causing the overlap you’re seeing.

---

## Implementation plan (code changes)

### 1) Move the hero content up (remove the forced top padding on mobile)
**File:** `src/components/meetups/MeetupDetailsDrawer.tsx`

- Change the hero wrapper classes so mobile no longer uses `pt-14`.
- Prefer a consistent hero shape on mobile: keep `aspect-video` (or switch to a slightly taller hero if needed, but without top padding that creates a gap).

**Planned change (conceptually):**
- Replace:
  - `isMobile ? "pt-14 min-h-[45vh]" : "aspect-video"`
- With something like:
  - `isMobile ? "aspect-video" : "aspect-video"`
  - (or a mobile-tuned height like `min-h-[40vh]` without top padding, if the hero feels too short)

This removes the blank strip at the top immediately.

---

### 2) Keep Orb/Mute behind the event details (stop elevating z-index)
**File:** `src/components/meetups/MeetupDetailsDrawer.tsx`

- Remove the `useEffect` that adds `event-detail-sheet-open` to the `<body>`.
  - This was only introduced to raise the Orb above the sheet.

**File:** `src/index.css`

- Remove the CSS block that raises Orb z-index when `body.event-detail-sheet-open` is present:
```css
body.event-detail-sheet-open .vitana-orb,
body.event-detail-sheet-open [data-vitana-orb="true"],
body.event-detail-sheet-open .OrbFloatingButton {
  z-index: 60 !important;
}
```

After this, the sheet (z-50) will naturally sit above the Orb (z-40), meaning:
- Orb stays “behind” (on the initial screen layer)
- X remains unobstructed

---

### 3) Ensure the X is always visible and tappable
**File:** `src/components/meetups/MeetupDetailsDrawer.tsx`

- Keep the X button, but make sure it’s positioned safely for mobile:
  - Use safe-area top padding if needed (`top-[max(1rem,env(safe-area-inset-top))]`) rather than pushing the whole hero down.
  - Keep `z-20` or raise slightly within the sheet content (not above the sheet globally).

This ensures Appilix top chrome + device notch doesn’t interfere, while avoiding the white gap issue.

---

## Acceptance criteria (what you should see after)
1) When opening an event on mobile:
   - The hero image starts higher (no white band above it).
2) The Orb/Mute button does NOT appear above the event detail screen.
3) The X close button is always visible and easy to tap.
4) Closing via X returns to the original list view and the Orb/Mute is visible again as normal.

---

## Files to change
- `src/components/meetups/MeetupDetailsDrawer.tsx`
  - Remove body-class z-index workaround
  - Remove hero `pt-14` padding approach; use safer positioning for X if needed
- `src/index.css`
  - Remove `event-detail-sheet-open` Orb z-index override

---

## Notes / tradeoffs
- This approach matches your request precisely: Orb stays on the initial screen layer while the event detail sheet overlays it.
- If we still need to protect the title from any overlap, we’ll do it by adjusting *overlay content spacing* (safe-area-aware) rather than padding the entire hero down (which creates the blank gap).

