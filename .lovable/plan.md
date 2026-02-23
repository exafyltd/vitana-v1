

## Fix: Wire Milestones, Gallery, Share & QR into Mobile Edit Profile

### Root Cause

`EditProfilePage.tsx` has its **own** mobile rendering (lines 309-439) that completely bypasses `ProfileLayout.tsx`. All the new features (milestones, photo gallery, share button, QR screen) were added to `ProfileLayout`, but when you view your own profile on mobile, `EditProfilePage` renders directly without ever calling `ProfileLayout`. That's why nothing changed.

### Changes

**File: `src/pages/EditProfilePage.tsx`**

1. **Add imports** for `MilestoneTimeline`, `useProfileMilestones`, `PhotoGallery`, `useProfileGallery`, `useProfileShare`, `ShareProfileModal`, `MobileQRShareScreen`

2. **Add hooks** in the component body (before the `isMobile` check):
   - `useProfileMilestones(profile.id)` for milestone CRUD
   - `useProfileGallery(profile.id)` for gallery CRUD
   - `useProfileShare(...)` for share functionality
   - `useState` for QR screen visibility

3. **Add `onShare` prop** to the `MobileIdCardSwitcher` at line 321-327:
   - Pass `onShare={shareHook.openShare}` so the share button on the ID card works

4. **Add milestones to the "about" tab** (lines 366-378):
   - Below the bio card, render `MilestoneTimeline` with full CRUD callbacks

5. **Replace mock media tab** (lines 380-382):
   - Replace `<MobileMediaTabContent />` with `<PhotoGallery>` using real data from `useProfileGallery`

6. **Add ShareProfileModal and MobileQRShareScreen** in the mobile return block (before closing `</AppLayout>`):
   - Render `ShareProfileModal` with share hook callbacks
   - Render `MobileQRShareScreen` for Instagram-style QR sharing

### Result

After this fix, viewing your own profile on mobile will show:
- Life Milestones section in the "About" tab
- Real Photo Gallery in the "Media" tab (replacing mock data)
- Share button on the identity card that opens the share modal
- Instagram-style QR code full-screen overlay accessible from the share flow
