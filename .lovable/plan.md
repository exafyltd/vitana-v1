

## Fix: Orders Mobile Layout Alignment

### Problem
The Orders mobile screen has spacing/alignment issues compared to other mobile hubs (visible in the screenshots):
1. **Double offset**: The sticky header uses `top-[calc(env(safe-area-inset-top,0px)+32px)]` but `MobileAppShell` already applies the same offset as `paddingTop` on the content wrapper — causing the title to sit too far below the app bar.
2. **Inconsistent header**: Uses a custom inline `h1` instead of the shared `StandardHeader` component used by all other mobile pages.
3. **Oversized sticky block**: The utility action bar is crammed inside the sticky header, making it overly tall and eating viewport space.

### Changes

**File: `src/components/orders/MobileOrdersView.tsx`**

1. Replace the custom sticky header with the standard mobile hub pattern:
   - Change sticky `top` from `top-[calc(env(safe-area-inset-top,0px)+32px)]` to `top-0` — MobileAppShell already handles the app bar offset.
   - Replace the inline `h1`/`p` with `<StandardHeader>` (which renders the compact mobile variant automatically).
   - Move `StandardHeader` outside the sticky block so it scrolls with content (matching Events/Health hub patterns).

2. Keep the `UtilityActionButton` bar in the sticky block but with tighter padding (`px-4 py-2` instead of the current spacing).

3. Reduce outer padding: change `px-4 pt-4 pb-2` header padding to `px-4 pt-2 pb-1` to match the standard `StandardHeader` mobile spacing (`pt-2 pb-1`).

### Result
The title will sit flush below the app bar, utility chips will be consistently spaced, and the layout will match the Events/Health/Diary mobile hubs exactly.

