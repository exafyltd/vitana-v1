

## Add Top App Bar to the Daily Diary screen

The Daily Diary page bypasses `AppLayout` and therefore doesn't receive the `MobileAppShell` wrapper that provides the TopAppBar + drawer. Fix: wrap the page content with `MobileAppShell`.

### `src/pages/MobileDailyDiary.tsx`

1. Import `MobileAppShell` from `@/components/mobile/MobileAppShell`.
2. Wrap the outer `<div>` with `<MobileAppShell>`.
3. The `MobileAppShell` already adds top padding (`calc(env(safe-area-inset-top) + 32px)`), so the page content will sit below the app bar automatically.

