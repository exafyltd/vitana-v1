

# Add Unified ORB Voice Widget (from Gateway)

## Overview
Replace the current `useOrbVoiceWidget` hook and the static `<script>` tag in `index.html` with a new `useOrbWidget` hook that dynamically loads the gateway's `orb-widget.js`, shows its built-in FAB, and manages auth. Remove the old React-based ORB trigger components since the widget handles everything.

## Changes

### 1. Create `src/hooks/useOrbWidget.ts`
New hook (exact content provided by user) that:
- Dynamically injects `orb-widget.js` from `VITE_GATEWAY_URL` into `<head>`
- Calls `VitanaOrb.init()` with `showFab: true`, auth token, and browser language
- Syncs auth token on session changes via `VitanaOrb.setAuth()`
- Cleans up on unmount (`destroy()` + remove script)

### 2. Update `index.html`
- Remove the static `<script src="…/orb-widget.js">` tag (line 76) — the hook now loads it dynamically

### 3. Update `src/components/AppLayout.tsx`
- Replace `import { useOrbVoiceWidget }` with `import { useOrbWidget }`
- Replace `useOrbVoiceWidget()` call with `useOrbWidget()`
- Remove `VitanaOrbButton` import and its usage in sidebar footer (~line 393)
- Remove `MobileFixedOrb` import and its usage

### 4. Update `src/index.css`
- Remove the `.vtorb-fab { display: none !important; }` rule (line 951) — the FAB should now be visible

### 5. Remove old ORB trigger components from other pages
- `src/pages/IntroExperience.tsx` — remove `MobileFixedOrb` import/usage
- `src/pages/AuthPages.tsx` — remove `MobileFixedOrb` import/usage
- `src/pages/portals/MaxinaPortal.tsx` — remove `MobileFixedOrb` import/usage

### 6. Keep but don't delete (yet)
- `src/hooks/useOrbVoiceWidget.ts` — can be deleted after verification
- `src/components/mobile/MobileFixedOrb.tsx` — can be deleted after verification
- `src/components/vitanaland/VitanaOrbButton.tsx` — can be deleted after verification
- `src/components/diary/DiaryOrb.tsx` — unrelated diary feature, keep as-is

## Result
- Single unified ORB FAB appears bottom-right on every screen (loaded from gateway)
- Clicking FAB opens the full-screen voice overlay
- Auth token stays in sync with Supabase session
- No more duplicate/custom ORB trigger buttons scattered across pages

