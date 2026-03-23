

## Fix: Music Gallery Not Visible in Profile Media Tab

### Investigation
The code is correctly wired: `MusicGallery` is imported and placed at line 295 of `ProfileLayout.tsx`, right after `VideoGallery`. The component logic is sound — when the user is the profile owner and has no tracks, it should show a dashed-border empty state with "No music yet" and an "Add your first track" button.

### Likely Cause
The empty state is too subtle — it blends in with the page background. The dashed border + `bg-muted/30` is nearly invisible, especially on mobile where the user might think the page ends after the Video Gallery section.

### Fix (2 changes in 1 file)

**File: `src/components/profile/gallery/MusicGallery.tsx`**

1. **Make the empty state much more prominent** — use a solid card background with stronger visual hierarchy (larger icon, bolder text, prominent upload button) to match the Photo Gallery empty state styling
2. **Add a loading state** — show a skeleton/spinner while the query loads so the section is visible even during data fetch, preventing a flash of nothing
3. **Always render the section header** (🎵 Music Gallery + Upload button) even during loading, so the user sees the section exists immediately

This ensures the Music Gallery section is always visible to profile owners, with a clear call-to-action to upload their first track.

### Files
- `src/components/profile/gallery/MusicGallery.tsx`

