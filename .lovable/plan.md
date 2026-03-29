

# Consolidate to Single ORB Hook

## Problem
Two ORB hooks exist: `useOrbWidget` (used in AppLayout) and `useOrbVoiceWidget` (unused but has correct gateway URL). Only `useOrbVoiceWidget` should remain.

## Changes

### 1. `src/components/AppLayout.tsx`
- Line 32: Change import from `useOrbWidget` to `useOrbVoiceWidget`
- Line 398: Change call from `useOrbWidget()` to `useOrbVoiceWidget()`

### 2. Delete `src/hooks/useOrbWidget.ts`
- No longer referenced after step 1

## Why this works
`useOrbVoiceWidget` already has the correct hardcoded gateway fallback URL (`https://gateway-q74ibpv6ia-uc.a.run.app`), while `useOrbWidget` has an empty string fallback causing 404s. The simpler hook in `useOrbVoiceWidget` calls `VitanaOrb.init()` / `setAuth()` / `destroy()` correctly.

