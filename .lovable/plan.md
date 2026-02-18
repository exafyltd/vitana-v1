

## Fix Missing App Bar on Mobile Connected Apps Screen

### Problem
The Connected Apps page (`/settings/connected-apps`) renders its mobile view without wrapping it in `AppLayout`. All other screens use `AppLayout`, which includes `MobileAppShell` (the component that provides the Top App Bar and swipe-to-open drawer). This is why the Connected Apps screen is the only one missing the app bar.

### Solution

**`src/pages/settings/ConnectedApps.tsx`** -- lines 59-68

Wrap the mobile return branch in `AppLayout` so it gets the same `MobileAppShell` treatment as every other screen.

Current:
```tsx
if (isMobile) {
  return (
    <>
      <SEO ... />
      <MobileConnectedAppsView />
    </>
  );
}
```

Updated:
```tsx
if (isMobile) {
  return (
    <AppLayout>
      <SEO ... />
      <MobileConnectedAppsView />
    </AppLayout>
  );
}
```

### What stays unchanged
- Desktop view (already wrapped in `AppLayout`)
- `MobileConnectedAppsView` content and layout
- All other screens

