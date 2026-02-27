

## Plan: Fix Video Upload "Failed to fetch" Error

### Root Cause Analysis

The Supabase bucket config is correct (5GB limit, proper MIME types, proper RLS policies). The "Failed to fetch" error is a browser-level `TypeError` caused by **two bugs in the upload flow**:

1. **`handleSubmit` in VideoUploadDialog doesn't `await` the upload** — it fires `onUpload()` (async) then immediately calls `reset()`, which clears the file/preview state while the upload is still in progress. This can cause the upload to fail mid-flight on mobile browsers.

2. **`handleUpload` in VideoGallery has no `try/catch`** — if `uploadMedia` throws (which it does after showing a toast), the error becomes an unhandled promise rejection. The dialog never closes, and the state is left inconsistent.

3. **WhatsApp videos may report as `video/3gpp`** — this MIME type is not in the `ACCEPTED_TYPES` list or the bucket's `allowed_mime_types`, which could silently block uploads. Need to add `video/3gpp` and `video/3gpp2` to both.

### Changes

**1. `src/components/profile/gallery/VideoUploadDialog.tsx`**
- Make `handleSubmit` async, await `onUpload`, and move `reset()` to after completion
- Change `onUpload` prop type to return `Promise<void>`
- Add `video/3gpp` and `video/3gpp2` to `ACCEPTED_TYPES` and the file input `accept` attribute
- Add try/catch with error handling so the dialog stays usable after a failure

**2. `src/components/profile/gallery/VideoGallery.tsx`**
- Add try/catch around `handleUpload` so errors from `uploadMedia` are handled gracefully
- Only close dialog and invalidate queries on success

**3. `src/hooks/useMediaUpload.ts`**
- Don't re-throw the error after catching — return `null` instead, so callers can check success without needing try/catch everywhere
- Log the full error object for better debugging

**4. SQL migration — update bucket allowed MIME types**
- Add `video/3gpp` and `video/3gpp2` to the `media-uploads` bucket's `allowed_mime_types` array

### Files to modify
1. `src/components/profile/gallery/VideoUploadDialog.tsx`
2. `src/components/profile/gallery/VideoGallery.tsx`
3. `src/hooks/useMediaUpload.ts`
4. SQL migration for bucket MIME types

