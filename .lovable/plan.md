

## Add Music Gallery to Profile Media Tab

### What
Add a "Music Gallery" section alongside the existing Photo Gallery and Video Gallery in the profile's Media tab. Users can upload, play, and delete audio tracks from their profile — same pattern as the Media Hub music feature but scoped to the user's profile.

### Changes

**New file: `src/components/profile/gallery/MusicUploadDialog.tsx`**
- Dialog with file input accepting audio formats (MP3, WAV, FLAC, AAC, OGG, M4A)
- Fields: title (required), description (optional), genre (optional), visibility toggle
- 50MB limit, file materialization for mobile reliability
- Progress bar during upload
- Mirrors `VideoUploadDialog` structure

**New file: `src/components/profile/gallery/MusicGallery.tsx`**
- Mirrors `VideoGallery` structure:
  - Query `media_uploads` where `media_type = 'music'` for the target user
  - Owner sees "Upload Music" button and delete controls
  - Non-owner with no tracks: component returns null
  - Each track row: play/pause button, title, artist (from `music_metadata`), duration, delete (owner only)
  - Uses `useAudioPlayer` for inline playback (play/pause toggle)
  - Uses `useMediaUpload` for uploads with `mediaType: 'music'`
  - Delete confirmation via AlertDialog
  - Music icon and "No music yet" empty state for owners

**Modified: `src/components/profile/shared/ProfileLayout.tsx`**
- Import `MusicGallery`
- Add `<MusicGallery userId={profileUserId} />` after `<VideoGallery />` in the mobile media tab (line ~293)

**Modified: `src/components/profile/shared/ProfileSplitNavigation.tsx`**
- Import `MusicGallery`
- Add `<MusicGallery userId={profileUserId} />` after `<VideoGallery />` in the desktop media tab (line ~138)

### Technical details

- Reuses existing `useMediaUpload` hook with `mediaType: 'music'` — handles storage upload, `media_uploads` insert, and `music_metadata` insert (genre/mood)
- Reuses existing `useAudioPlayer` for play/pause — same audio player used in `MobileMusicList`
- Each track displays as a horizontal row (play button, info, actions) matching the `MobileMusicList` visual style but simplified (no bookmark/share — profile context)
- Accepted MIME types: `audio/mpeg, audio/wav, audio/flac, audio/aac, audio/ogg, audio/mp4, audio/x-m4a`
- No new database tables or migrations needed — uses existing `media_uploads` + `music_metadata` tables
- Web/mobile parity: both `ProfileLayout` (mobile) and `ProfileSplitNavigation` (desktop) get the gallery

### Files
- `src/components/profile/gallery/MusicUploadDialog.tsx` (new)
- `src/components/profile/gallery/MusicGallery.tsx` (new)
- `src/components/profile/shared/ProfileLayout.tsx` (add import + component)
- `src/components/profile/shared/ProfileSplitNavigation.tsx` (add import + component)

