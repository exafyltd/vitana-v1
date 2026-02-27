

## Root Cause Analysis: Video Upload "Failed to fetch"

I found **two concrete bugs** causing video uploads to fail, plus a diagnostic gap.

### Bug 1: Missing `contentType` in storage upload (Primary cause)

The **photo gallery upload** (which works) explicitly sets `contentType: file.type`:
```typescript
// useProfileGallery.ts — WORKS
.upload(filePath, file, { contentType: file.type });
```

The **video upload** does NOT:
```typescript
// useMediaUpload.ts line 85-90 — FAILS
.upload(filePath, file, {
  cacheControl: '3600',
  upsert: false
  // NO contentType!
});
```

On Android browsers, the Supabase JS client may fail to auto-detect the MIME type from the File object, causing the bucket's `allowed_mime_types` enforcement to reject it at the network level — resulting in "Failed to fetch".

### Bug 2: `thumbnail_url` column doesn't exist in `video_metadata`

The code at `useMediaUpload.ts` line 155-158 inserts a `thumbnail_url` field:
```typescript
await supabase.from('video_metadata').insert({
  media_id: mediaUpload.id,
  topic: metadata.topic || null,
  thumbnail_url: metadata.thumbnailUrl || null, // COLUMN DOESN'T EXIST
});
```

The `video_metadata` table only has: `media_id`, `video_type`, `topic`, `resolution`, `has_captions`. PostgREST rejects unknown columns with a 400 error. When this fails, the code deletes the already-uploaded `media_uploads` row and throws "Failed to save video metadata."

Even if Bug 1 is fixed, Bug 2 would still prevent any video upload from completing.

### Bug 3: No diagnostic logging

There is no way to tell which step fails because there are no `console.log` statements before each step.

---

### Changes

**1. `src/hooks/useMediaUpload.ts`**
- Add `contentType: file.type` to the storage upload options (line 87-90)
- Remove `thumbnail_url` from the `video_metadata` insert (line 155-158)
- Add `console.log` breadcrumbs before each step for future debugging

**2. No database migration needed** — the table schema is correct; the code was inserting a nonexistent column.

