
# Remove All Remaining Legacy ORB UI So Only the Gateway Widget Remains

## What I verified
Your correction is valid: the plan must treat `AppLayout.tsx` and `AuthPages.tsx` as active edits, not “already cleaned.” I also re-checked the repo and confirmed the remaining old ORB surface area still includes:
- `MobileBottomNav.tsx`
- `App.tsx`
- `IntroExperience.tsx`
- `MaxinaPortal.tsx`
- `AppLayout.tsx`
- `AuthPages.tsx`
- `VitanaGuideOrbIntro.tsx`
- `VitanaOrbButton.tsx`
- `MobileFixedOrb.tsx`

`VitanaAudioOverlay.tsx` still uses `VitanalandPortalSeed`, but removing its usage from `App.tsx` handles it implicitly for runtime cleanup.

## Updated implementation plan

### 1. `src/components/mobile/MobileBottomNav.tsx`
- Remove the center ORB trigger (`VitanalandPortalSeed`)
- Remove orb-only imports and click logic
- Refactor the bottom nav to a clean 4-item evenly spaced layout with no center gap

### 2. `src/App.tsx`
- Remove `PersistentGuideOrb` import and render
- Remove `VitanaAudioOverlay` import and render
- Keep `VitanalandNavigationProvider` for now unless a follow-up pass proves it is fully unused

### 3. `src/components/AppLayout.tsx`
- Remove any remaining legacy ORB imports/usages:
  - `VitanaOrbButton`
  - `MobileFixedOrb`
- Keep `useOrbWidget()` as the only ORB integration path in layout

### 4. `src/pages/AuthPages.tsx`
- Remove `MobileFixedOrb` import
- Remove `<MobileFixedOrb />` render
- Leave the auth page layout otherwise unchanged

### 5. `src/pages/IntroExperience.tsx`
- Remove `VitanalandPortalSeed` import
- Remove any old orb click handler / navigation hook usage tied to the seed
- Remove the legacy ORB UI block so the gateway FAB is the only entry point

### 6. `src/pages/portals/MaxinaPortal.tsx`
- Remove `VitanalandPortalSeed` import
- Remove any old orb click handler tied to that button
- Remove the legacy ORB UI block

### 7. Safe deletion phase after imports/usages are removed
Delete only after the above files are cleaned:
- `src/components/vitanaland/VitanaGuideOrbIntro.tsx`
- `src/components/vitanaland/VitanaOrbButton.tsx`
- `src/components/mobile/MobileFixedOrb.tsx`

## Deletion safety notes
- `VitanaGuideOrbIntro.tsx` appears safe to delete once confirmed unused
- `VitanaOrbButton.tsx` and `MobileFixedOrb.tsx` must not be deleted until their imports/usages are removed from:
  - `src/components/AppLayout.tsx`
  - `src/pages/AuthPages.tsx`
  - plus any other remaining references found during implementation

## Expected result
- Only the gateway widget’s built-in FAB remains as the ORB entry point
- No duplicate ORB visuals on mobile or desktop
- No broken imports from deleting still-referenced files
- Bottom navigation becomes a standard 4-item mobile nav without the center orb

## Technical notes
```text
Cleanup order:
1. Remove runtime renders/imports
2. Remove legacy page-level ORB blocks
3. Delete unused component files
4. Smoke test mobile + desktop routes
```

Key routes to verify after implementation:
- `/auth`
- `/_intro/:tenantSlug`
- `/maxina`
- `/inbox` on mobile-sized viewport
- a standard app route using `AppLayout`
