

## Fix: Autopilot Popup Not Responsive on Mobile

### Problem
The `AutopilotPopup` (`src/components/AutopilotPopup.tsx`) uses a Radix `Dialog` with `max-w-2xl max-h-[80vh]` on the `DialogContent` (line 156). This renders a fixed-width centered modal that gets clipped on narrow viewports, as shown in the screenshot.

Additionally, the `DialogFooter` (line 221) lays out three buttons horizontally (`flex space-x-2`), which overflows on mobile.

### Changes

**File: `src/components/AutopilotPopup.tsx`**

1. Make `DialogContent` responsive: on mobile, use full-width/full-height sheet-style layout (`w-full h-[100dvh] max-w-full max-h-full rounded-none` on mobile, keep `max-w-2xl max-h-[80vh]` on desktop).
2. Import and use `useIsMobile` hook.
3. Make the footer buttons stack vertically on mobile instead of side-by-side (use `flex-col` on mobile, `flex-row` on desktop).
4. Ensure the `ScrollArea` fills available space on mobile with `flex-1` instead of a fixed `max-h-96`.

This follows the project's established pattern: "All popups are full-screen (fixed inset-0) on mobile, never centered modals."

