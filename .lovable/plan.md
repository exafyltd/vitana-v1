

# Fix: Appilix API Message Format -- Correct the Bridge Utility

## Root Cause Found

The current `src/lib/appilix.ts` uses completely **wrong message formats** that Appilix ignores silently. The Appilix native shell never receives a valid command, so the App Bar and Navigation Drawer stay uninitialized on first load. After a manual refresh, the native app re-initializes its own UI from its saved config, which is why the hamburger icon appears only after refresh.

## What's Wrong (Current vs. Correct API)

| Feature | Current Code (WRONG) | Correct Appilix API |
|---------|---------------------|---------------------|
| Message key | `action` | `type` |
| Settings structure | `{ action: "update_settings", settings: {...} }` | `{ type: "update_settings", updates: { modules: {...} } }` |
| Navigation | `{ action: "navigate", direction: "backward" }` | `{ type: "url_backward" }` |
| Share | `{ action: "share", text, subject }` | `{ type: "share", props: { text, subject } }` |
| Launch URL | `{ action: "launch_external", url }` | `{ type: "launch_url_externally", props: { url } }` |
| Open Drawer | `{ action: "open_drawer" }` | URL scheme `appilix-drawer://open` |

## Implementation Plan

### Step 1: Fix `src/lib/appilix.ts` -- Correct All Message Formats

Rewrite every `post()` call to match the actual Appilix API from their changelog documentation:

- **`updateSettings()`**: Use `{ type: "update_settings", updates: { modules: { ... } } }` structure
- **`forceAppBarVisibility()`**: Send correct nested module settings to enable app_bar and navigation_drawer modules
- **`navigate()`**: Use direction-specific types (`url_backward`, `url_forward`, `url_reload`)
- **`share()`**: Use `{ type: "share", props: { text, subject } }`
- **`launchExternal()`**: Use `{ type: "launch_url_externally", props: { url } }`
- **`openDrawer()`**: Keep the `appilix-drawer://open` URL scheme (this is correct per Appilix docs) as primary, with postMessage as secondary

### Step 2: Add Early Detection Script in `index.html`

Add a small inline `<script>` block before the React bundle that:
- Checks for `window.appilix` immediately
- If found, fires the `update_settings` message right away (before React even mounts)
- This catches the scenario where Appilix injects its global before the JS bundle loads

### Step 3: Enhance `useAppilix` Hook

- Add `visibilitychange` listener to re-fire visibility settings when the app returns from background
- Add `load` event listener as a secondary trigger
- Re-fire on every SPA route change (the navigation drawer state might reset on navigation)
- Extend polling to 5 seconds for slower devices

### Step 4: Re-fire on Route Changes

In `useAppilix`, add a location listener so that every SPA navigation re-sends the `forceAppBarVisibility()` command, ensuring the native UI stays consistent.

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/appilix.ts` | Rewrite | Fix all message formats to match actual Appilix API |
| `src/hooks/useAppilix.ts` | Enhance | Add visibilitychange, load event, route-change re-fire |
| `index.html` | Modify | Add early inline script for pre-React detection |

## Expected Result

The Appilix native shell will receive correctly formatted messages and immediately show the App Bar with the hamburger menu icon on first load, without requiring a page refresh.

