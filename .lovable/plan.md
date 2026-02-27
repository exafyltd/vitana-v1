

## Root Cause: "Failed to fetch" at 30% on Android

The upload fails exactly at the `supabase.storage.upload()` call (progress 30%). On Android, when a video file is selected from WhatsApp or a file manager, the browser's file descriptor can become invalid before the upload starts — the Fetch API then throws `TypeError: Failed to fetch` because it cannot read the file body.

The fix is to **read the file into an ArrayBuffer immediately** when selected, so the data lives in memory and is not dependent on the OS-level file descriptor remaining valid.

Additionally, the `extractDuration` function is never called for video uploads (only music/podcast), so videos never get duration metadata extracted.

### Changes

**1. `src/hooks/useMediaUpload.ts`**
- Before uploading, convert `file` to `ArrayBuffer` → `Blob` with explicit `type`, so the upload body is a memory-resident blob rather than a file descriptor reference
- Also extract duration for video files (not just music/podcast)
- Add more granular `console.log` around the storage upload step

**2. `src/components/profile/gallery/VideoUploadDialog.tsx`**
- When the user selects a file, immediately read it into an `ArrayBuffer` and create a new `File` from that buffer — this "materializes" the file into memory before any upload attempt

