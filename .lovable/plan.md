
Do I know what the issue is? Yes.

1) Update `src/components/profile/mobile/MobileCreatePostSheet.tsx` to materialize the selected image immediately (not at post-time):
- Make `handleImageSelect` `async`.
- After validation, run:
  - `const buffer = await file.arrayBuffer()`
  - `const materializedFile = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified })`
- Store `materializedFile` in state and build preview from it.
- Add a specific destructive toast for file-read failures (`"Could not read selected image"`), and return early.

2) Keep upload step simple and deterministic in `handlePost`:
- Remove the second `arrayBuffer -> Blob` conversion from submit-time.
- Upload the already materialized `imageFile` directly with explicit MIME:
  - `.upload(path, imageFile, { contentType: imageFile.type, upsert: false })`
- Check and throw on `uploadError` with message details.

3) Stop generating signed URLs for profile post images in this flow:
- Replace `createSignedUrl(...)` with `getPublicUrl(path)` because `media-uploads` is public in current config.
- Use returned `publicUrl` as `imageUrl`.

4) Improve failure visibility so the exact broken step is visible:
- Split `handlePost` into stage-specific guarded blocks (auth, upload, url, insert).
- Show toast descriptions from actual error messages (instead of only generic `"Something went wrong"`).
- Add temporary console logs for each stage (`[PostUpload] read`, `[PostUpload] upload`, `[PostUpload] url`, `[PostUpload] insert`).

5) Fix UX mismatch that can trigger wrong test behavior:
- If posts are image-only, change footer label from `"Foto / Video"` to `"Foto"`.
- Keep `accept="image/*"` unchanged (or explicitly add video support in a separate task).

Technical details:
- Primary file: `src/components/profile/mobile/MobileCreatePostSheet.tsx`
- No DB migration required.
- Existing storage/RLS path convention remains: `{userId}/posts/...` in `media-uploads`.
- This aligns post composer with the working Android pattern already used in `VideoUploadDialog` (materialize at selection-time).

Validation checklist:
- Android test 1: select image from WhatsApp/media picker, wait 20–60s, then post.
- Android test 2: repeat with same file re-selected.
- Confirm object appears under `media-uploads/{userId}/posts/`.
- Confirm new row in `profile_posts` has non-null `image_url`.
- Confirm success toast appears and no generic error toast.
