

## Fix Mobile Profile: Milestones, Gallery, Share & QR Code

The new features (milestones, photo gallery, sharing) were only integrated into the desktop `ProfileSplitNavigation` component but **not** into the mobile layout in `ProfileLayout.tsx`. The mobile profile still uses the old tab structure with mock data and has no share button. This plan wires everything into the mobile experience and adds Instagram-style QR code sharing.

---

### Problem Summary

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Milestones | Works (in SplitNavigation) | Missing entirely |
| Photo Gallery | Works (in Media tab) | Shows placeholder data |
| Share own profile | Not available (only others) | Not available |
| Share others' profile | Works (ShareProfileModal) | Button missing |
| QR Code share | In ShareProfileModal | Not accessible |

---

### Changes

**1. Add Milestones to Mobile About Tab**

File: `src/components/profile/shared/ProfileLayout.tsx`
- Import `MilestoneTimeline` and `useProfileMilestones`
- In the mobile `about` tab content (lines 174-185), render `MilestoneTimeline` below the bio card
- Pass `profile.id` to the milestones hook for CRUD

**2. Wire Real Photo Gallery into Mobile Media Tab**

File: `src/components/profile/shared/ProfileLayout.tsx`
- Import `PhotoGallery` and `useProfileGallery`
- Replace `<MobileMediaTabContent />` (line 188) with `<PhotoGallery>` using real data from the hook
- Keep `MobileMediaTabContent` below for any other media content

**3. Add Share Button to Mobile Identity Card (Own + Others)**

File: `src/components/profile/mobile/MobileIdentityCard.tsx`
- Add `onShare` callback prop
- Render a share icon button (Share2) in the top-left area of the card (opposite the edit button)
- Visible for both own profile and others' profiles

File: `src/components/profile/mobile/MobileIdCardSwitcher.tsx`
- Add `onShare` prop, pass it through to `MobileIdentityCard`

**4. Wire Share Modal into Mobile Layout**

File: `src/components/profile/shared/ProfileLayout.tsx`
- Import `useProfileShare`, `ShareProfileModal`
- Add share state and hook in the mobile branch
- Pass `onShare` callback to `MobileIdCardSwitcher` that opens the share modal
- Render `ShareProfileModal` in the mobile layout (works for own profile too -- remove the `!isOwner` restriction from the modal rendering)

**5. Enable Share for Own Profile**

File: `src/components/profile/shared/ShareProfileModal.tsx`
- Currently only rendered when `!isOwner`. The modal itself works fine for own profiles.
- In `ProfileLayout.tsx`, render it unconditionally (own + others)

**6. Instagram-style QR Code Full-Screen Share**

File: `src/components/profile/mobile/MobileQRShareScreen.tsx` (NEW)
- Full-screen overlay (like Instagram's QR share screen from the screenshot)
- Centered QR code card with Vitana branding, user's handle below
- Three action buttons at the bottom: "Share Profile", "Copy Link", "Download QR"
- Close button (X) top-left
- Background with subtle gradient pattern
- Uses `QRCodeSVG` from `qrcode.react`

File: `src/components/profile/shared/ShareProfileModal.tsx`
- Add a "QR Code Card" button that on mobile opens the new `MobileQRShareScreen` instead of inline QR

File: `src/components/profile/shared/ProfileLayout.tsx`
- Add state for QR share screen
- Accessible from the share modal or directly via a dedicated QR button on the ID card

---

### Technical Details

**New file:** `src/components/profile/mobile/MobileQRShareScreen.tsx`
- Props: `isOpen`, `onClose`, `profileUrl`, `profileName`, `profileHandle`, `avatarUrl`
- Full-viewport overlay with `fixed inset-0 z-50`
- QR code rendered with `QRCodeSVG` (size 220, level H)
- Handle text `@{handle}` below the QR card
- Three circular action buttons: Share (native share API), Copy Link (clipboard), Download (SVG blob download)
- Translatable labels using `useTranslation`

**Modified files:**

`src/components/profile/shared/ProfileLayout.tsx` -- Major mobile integration:
- Add hooks: `useProfileMilestones(profile.id)`, `useProfileGallery(profile.id)`, `useProfileShare(...)`
- Mobile about tab: add `MilestoneTimeline` below bio
- Mobile media tab: add `PhotoGallery` above existing content
- Add share FAB or wire share through `MobileIdCardSwitcher`
- Render `ShareProfileModal` and `MobileQRShareScreen`

`src/components/profile/mobile/MobileIdentityCard.tsx`:
- Add `onShare?: () => void` prop
- Render share button (top-left corner, ghost style matching edit button)

`src/components/profile/mobile/MobileIdCardSwitcher.tsx`:
- Add `onShare?: () => void` prop, pass to `MobileIdentityCard`

**i18n additions** (both `en.json` and `de.json`):

| Key | English | German |
|-----|---------|--------|
| `qrShare.title` | QR Code | QR-Code |
| `qrShare.scanToView` | Scan to view profile | Scannen um Profil anzuzeigen |
| `qrShare.shareProfile` | Share Profile | Profil teilen |
| `qrShare.copyLink` | Copy Link | Link kopieren |
| `qrShare.download` | Download | Herunterladen |

