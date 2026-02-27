

## Fix: Post image upload failing on Android

The image selection works (preview shows), but the upload fails. The post upload code at line 58 has the same two issues we already fixed for video uploads:

1. **No `contentType`** — `supabase.storage.upload(path, imageFile)` without explicit `contentType` causes Android rejection
2. **No memory materialization** — the file descriptor can go stale on Android before upload completes

### Changes to `src/components/profile/mobile/MobileCreatePostSheet.tsx`

**In `handlePost` (lines 53-61)**, before uploading:
- Read `imageFile` into `ArrayBuffer` → `Blob` with explicit type
- Pass `{ contentType: imageFile.type }` to `supabase.storage.upload()`

```typescript
// Current (line 58):
const { error: uploadError } = await supabase.storage.from('media-uploads').upload(path, imageFile);

// Fixed:
const arrayBuffer = await imageFile.arrayBuffer();
const blob = new Blob([arrayBuffer], { type: imageFile.type });
const { error: uploadError } = await supabase.storage
  .from('media-uploads')
  .upload(path, blob, { contentType: imageFile.type });
```

This applies the exact same materialization pattern that fixed the video upload.

