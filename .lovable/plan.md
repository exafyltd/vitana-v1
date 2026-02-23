

## Fix Photo Upload & Add Video Support to Mobile Media Tab

### Problem 1: Photo Upload Fails Silently

Two bugs prevent gallery photo uploads from working:

**Bug A: Wrong storage bucket for images.**
The `useProfileGallery` hook uploads to the `media-uploads` bucket, but that bucket only allows video/audio MIME types (`video/mp4`, `video/webm`, `audio/mpeg`, etc.). Image files (`image/jpeg`, `image/png`, `image/webp`) are rejected by Supabase storage.

**Bug B: Storage path doesn't match RLS policy.**
The upload path is `gallery/{userId}/{uuid}.jpg`, but the storage RLS policy checks `(storage.foldername(name))[1] = auth.uid()`. Since the first folder is `gallery` (not the user ID), the policy denies the upload.

### Problem 2: No Video Support in Media Tab

The Media tab only shows the Photo Gallery section. There's no way to browse or upload video content from the profile.

---

### Fix Plan

**1. SQL Migration -- Update `media-uploads` bucket to also allow image types**

Add image MIME types to the `media-uploads` bucket's allowed list so it accepts both images and videos:
- Add: `image/jpeg`, `image/png`, `image/webp`

**2. Fix upload path in `useProfileGallery.ts`**

Change the file path from `gallery/{userId}/{uuid}.ext` to `{userId}/gallery/{uuid}.ext` so the user ID is the first folder segment and matches the existing storage RLS policy.

**3. Add Video Gallery section to the Media tab in `EditProfilePage.tsx`**

Below the Photo Gallery, add a "Video Gallery" section that:
- Uses the existing `useMediaUpload` hook and queries `media_uploads` table filtered by `media_type = 'video'`
- Shows a grid of video thumbnails (using the first frame or a play icon overlay)
- Allows uploading new videos (reusing the existing upload infrastructure)
- Links to the media player when tapped

**4. Create `VideoGallery` component**

New file: `src/components/profile/gallery/VideoGallery.tsx`
- Queries `media_uploads` where `user_id = targetUserId` and `media_type = 'video'`
- Displays video thumbnails in a grid (similar layout to PhotoGallery)
- Each video card shows: thumbnail with play icon overlay, title, duration
- Owner sees upload button and delete option
- Clicking a video navigates to the media player page

**5. Create `VideoUploadDialog` component**

New file: `src/components/profile/gallery/VideoUploadDialog.tsx`
- Similar to PhotoUploadDialog but for video files
- Accepts `video/mp4`, `video/webm`, `video/quicktime`
- Shows video preview after selection
- Fields: title (required), description (optional), visibility toggle
- Uses the existing `useMediaUpload` hook for the actual upload

**6. Add video gallery to both mobile implementations**

- `EditProfilePage.tsx`: Add `VideoGallery` below `PhotoGallery` in the media tab
- `ProfileLayout.tsx`: Same integration for visitor view

**7. i18n translations**

Add keys for the video gallery section in both `en.json` and `de.json`:

| Key | English | German |
|-----|---------|--------|
| `gallery.videos` | Video Gallery | Videogalerie |
| `gallery.uploadVideo` | Upload Video | Video hochladen |
| `gallery.noVideos` | No videos yet | Noch keine Videos |
| `gallery.addFirstVideo` | Add your first video | Erstes Video hinzufuegen |

---

### Technical Details

**SQL Migration:**
```sql
UPDATE storage.buckets
SET allowed_mime_types = array['video/mp4','video/webm','video/quicktime','audio/mpeg','audio/wav','audio/ogg','audio/mp4','image/jpeg','image/png','image/webp']
WHERE id = 'media-uploads';
```

**Path fix in `useProfileGallery.ts`:**
Line 42: change `gallery/${user.id}/${uuidv4()}.${ext}` to `${user.id}/gallery/${uuidv4()}.${ext}`

**VideoGallery component** will use a new `useProfileVideos` hook that queries:
```ts
supabase.from('media_uploads')
  .select('*')
  .eq('user_id', targetUserId)
  .eq('media_type', 'video')
  .order('created_at', { ascending: false })
```

