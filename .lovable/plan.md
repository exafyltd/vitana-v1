

## Plan: Reduce video upload limit to 50MB

The upload keeps failing — likely the Supabase storage tier or network is rejecting large files. Reducing to 50MB should help isolate.

### Changes

**1. `src/components/profile/gallery/VideoUploadDialog.tsx`** (line 22)
- Change `MAX_VIDEO_SIZE` from `500 * 1024 * 1024` to `50 * 1024 * 1024`
- Update the size hint text from "500 MB" to "50 MB"

**2. `src/hooks/useMediaUpload.ts`** (line 29)
- Change video limit from `5 * 1024 * 1024 * 1024` to `50 * 1024 * 1024`

**3. SQL migration** — Update bucket `file_size_limit` to 50MB (52428800)

