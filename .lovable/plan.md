
# Fix: Appilix App Bar and Navigation Drawer Visibility

## Problem

The Appilix native app wraps the VITANA web app in a WebView. It provides a native App Bar with a hamburger menu icon that opens a Navigation Drawer. Currently, the hamburger icon only appears after a page refresh -- it's invisible on initial load.

**Root Cause**: There is zero Appilix bridge/integration code in the web app. The native shell injects a global `appilix` object into the WebView, but the web app never signals readiness or forces the App Bar state. The Appilix WebView likely finishes rendering its native UI after the web app has already loaded, causing a race condition where the hamburger icon state is not properly initialized.

## Solution

Create an Appilix bridge utility and a React hook that:
1. Detects whether the app is running inside Appilix's WebView
2. Forces the App Bar and Navigation Drawer visibility on load
3. Provides a clean API for other components to interact with Appilix native features
4. Uses `ResizeObserver` + polling as a fallback to ensure the `appilix` global is detected even if it's injected late

## Technical Implementation

### Step 1: Create Appilix Bridge Utility

**New file: `src/lib/appilix.ts`**

A utility module that:
- Detects the `appilix` global object (injected by the Appilix WebView shell)
- Provides typed wrapper functions for all Appilix postMessage APIs:
  - `openDrawer()` -- opens the navigation drawer
  - `navigate(direction)` -- backward/forward/reload
  - `updateSettings(settings)` -- runtime setting changes (e.g., App Bar colors)
  - `share(text, subject?)` -- native share dialog
  - `launchExternal(url)` -- open URL in external browser
- Includes an `isAppilix()` check that returns `true` when running inside the Appilix WebView
- Handles both old API (`appilix-drawer://open` via href) and new API (`appilix.postMessage`)

### Step 2: Create `useAppilix` Hook

**New file: `src/hooks/useAppilix.ts`**

A React hook that:
- Runs on mount (useEffect) to detect the Appilix environment
- Uses a polling mechanism (checking every 100ms for up to 3 seconds) to wait for the `appilix` global to be injected -- this solves the race condition where the WebView shell injects it after React hydration
- Once detected, sends an `update_settings` message to force the App Bar module to be visible and ensure the hamburger icon renders
- Exposes `isAppilix`, `openDrawer`, and `isReady` state
- No hydration mismatch risk because the state starts as `false` and updates after mount via useEffect

### Step 3: Integrate into App Root

**Modified file: `src/App.tsx`**

- Import and call `useAppilix()` at the top level of the app
- This ensures the bridge initializes as early as possible during the app lifecycle
- The hook runs its detection/force-visibility logic in a useEffect, so no SSR/hydration issues arise

### Step 4: Add Drawer Open Capability to Mobile Layout

**Modified file: `src/components/AppLayout.tsx`** (optional enhancement)

- When running inside Appilix, the web app can programmatically open the native drawer via `openDrawer()` -- useful if you want to add a hamburger button fallback in the web UI itself

## How This Fixes the Issue

```text
Current Flow (broken):
  Appilix loads WebView
    -> React app renders
    -> App Bar renders but hamburger state is uninitialized
    -> User sees no hamburger icon
    -> After refresh: Appilix re-initializes -> hamburger appears

Fixed Flow:
  Appilix loads WebView
    -> React app renders
    -> useAppilix polls for 'appilix' global (up to 3s)
    -> Detects appilix object
    -> Sends update_settings to force App Bar visibility
    -> Hamburger icon appears immediately
```

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/appilix.ts` | Create | Bridge utility with typed Appilix API wrappers |
| `src/hooks/useAppilix.ts` | Create | React hook for detection, polling, and force-visibility |
| `src/App.tsx` | Modify | Mount the useAppilix hook at app root |
