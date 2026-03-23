
## Fix Music Gallery Visibility on Mobile Profile

### Root cause
The main issue is not just styling: the mobile **Edit Profile** media tab does not render `MusicGallery` at all.

I confirmed:
- `ProfileLayout.tsx` includes `MusicGallery` under Photos + Videos
- `ProfileSplitNavigation.tsx` includes it on desktop
- but `EditProfilePage.tsx` mobile media tab only renders:
  - `PhotoGallery`
  - `VideoGallery`
- so on the owner’s main mobile editing flow, users never see a music section or upload CTA

That matches your screenshot exactly.

### Implementation plan

**1. Fix the missing mobile owner flow**
- Update `src/pages/EditProfilePage.tsx`
- Add `<MusicGallery userId={user?.id} />` directly below `VideoGallery` in the mobile `media` tab

This is the critical fix so the section actually appears where users expect it.

**2. Keep the Music section visually obvious**
- Refine `src/components/profile/gallery/MusicGallery.tsx` so the section is clearly visible even with zero tracks:
  - always show the section header
  - keep the upload button visible for owners
  - use a stronger empty-state card
  - keep the “Add your first track” CTA prominent

**3. Make discoverability better for profile owners**
- Ensure the empty state copy explicitly says users can upload music to their profile
- Keep the upload CTA visible without needing existing tracks

### Files to update
- `src/pages/EditProfilePage.tsx`
- `src/components/profile/gallery/MusicGallery.tsx`

### Expected result
After this fix:
- mobile profile owners will see a visible **Music Gallery** section in the Media tab
- they will have a clear **Upload Music** / **Add your first track** action
- users will no longer think music upload is unsupported or hidden

### Technical note
This is primarily a wiring bug in the owner/mobile flow, not a database or upload issue. The music component already exists; it just was not included in one of the key mobile profile screens.
