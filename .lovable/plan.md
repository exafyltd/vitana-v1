

## Fix: Desktop Sidebar Search Dropdown Not Working

### Root Cause
The `GlobalSearch` component uses `ResponsivePopover` (Radix Popover on desktop) to show search suggestions. Radix Popover has built-in focus management that conflicts with the search input — when the popover opens, it can steal focus from the input or close itself when the input re-focuses. This causes the dropdown to flash or never appear, making search appear broken.

### Fix
Replace the `ResponsivePopover` wrapper in `GlobalSearch.tsx` with a simple portal-based absolutely-positioned dropdown on desktop — the same pattern used successfully in the mobile drawer search and other search dropdowns across the platform.

**File: `src/components/GlobalSearch.tsx`**

1. Remove `ResponsivePopover`, `ResponsivePopoverTrigger`, `ResponsivePopoverContent` imports
2. Use a `useRef` on the input wrapper to get position via `getBoundingClientRect()`
3. Render the suggestions dropdown as a `ReactDOM.createPortal` into `document.body` with `position: fixed`, aligned to the input
4. Use `onMouseDown` (not `onClick`) on suggestion items to prevent input blur from dismissing before the click registers
5. Close dropdown on `Escape` key or clicking outside (existing `onBlur` logic)
6. Keep the existing search logic, member fetching, keyboard navigation — only change the rendering approach

### Result
- Dropdown renders without Radix focus interference
- Input stays focused while browsing suggestions
- Matches the proven portal pattern used elsewhere in the app
- No changes to search logic or member fetching

### Files
- `src/components/GlobalSearch.tsx`

