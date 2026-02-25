

## Fix: Video upload fails because it targets a non-existent storage bucket

### Problem

The `useMediaUpload` hook (used by the Video Gallery) maps each media type to a different storage bucket:

- `music` → `media-music`
- `podcast` → `media-podcasts`
- `video` → `media-videos`

However, only the `media-uploads` bucket exists and is configured with the correct RLS policies and MIME type allowances. When a user tries to upload a video, Supabase returns an error because the `media-videos` bucket does not exist.

### Changes — 1 file

**`src/hooks/useMediaUpload.ts`**

Change all three bucket mappings to use the single existing `media-uploads` bucket:

```tsx
// BEFORE (lines 19-24)
const BUCKET_MAP = {
  music: 'media-music',
  podcast: 'media-podcasts',
  video: 'media-videos',
} as const;

// AFTER
const BUCKET_MAP = {
  music: 'media-uploads',
  podcast: 'media-uploads',
  video: 'media-uploads',
} as const;
```

This aligns with the existing photo gallery upload flow (in `useProfileGallery.ts`), which already uploads to `media-uploads`. The file path already includes the user ID and a timestamp, so there are no collision concerns.

### Why this fixes it

The photo upload works because `useProfileGallery` uploads directly to `media-uploads`. The video upload fails because `useMediaUpload` tries to use `media-videos`, which was never created. Pointing all media types at the existing bucket resolves the issue without requiring any database migrations.

