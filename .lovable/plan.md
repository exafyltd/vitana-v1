

## Plan: Fix Video Upload + German Translations

### Investigation Summary

- The `media-uploads` bucket has `file_size_limit = 524288000` (500MB) — on Pro plan this should be fine
- The client-side limit in `useMediaUpload.ts` is also 500MB — matches
- The storage RLS path convention is correct (`{userId}/...`)
- The `media_uploads` DELETE policy only allows staff/admin — the **owner cannot delete their own uploads** (this is a secondary bug)
- The actual upload error likely comes from the Supabase storage layer; need better error logging to diagnose

### Likely root cause

The bucket's `file_size_limit` may have been overridden or the bucket config may need updating now that you're on Pro. A migration to update the bucket limit to match Pro tier (5GB) would resolve any residual platform-level constraint.

### Changes

**1. Database migration — update bucket file size limit**
- Update `media-uploads` bucket `file_size_limit` to 5GB (5368709120) to match Pro plan
- Also add owner DELETE policy on `media_uploads` table (currently only staff/admin can delete)

**2. `src/hooks/useMediaUpload.ts`** — Update client-side video limit to match
- Change video limit from 500MB to 5GB (or a reasonable cap like 2GB)
- Add better error logging with the actual Supabase error details

**3. `src/components/profile/gallery/VideoUploadDialog.tsx`** — Add file size hint
- Show "Max 500MB" (or updated limit) below the format line in the dropzone
- Add client-side size validation in `handleFile` with user-facing error toast

**4. `src/i18n/de.json`** — Add missing German translations
The `VideoUploadDialog` uses these keys that fall back to English:
- `editProfile.title` → needs "Titel"
- `editProfile.titlePlaceholder` → needs "Videotitel"
- `editProfile.description` → needs "Beschreibung"
- `editProfile.descriptionPlaceholder` → needs "Optionale Beschreibung..."
- `common.uploading` → needs "Wird hochgeladen..."

These keys already exist in `editProfile` and `common` sections but are missing the specific entries used by the video dialog.

### Files to modify
1. **SQL migration** — Update bucket limit + add owner delete policy
2. **`src/hooks/useMediaUpload.ts`** — Adjust video size limit
3. **`src/components/profile/gallery/VideoUploadDialog.tsx`** — Add size hint + validation
4. **`src/i18n/de.json`** — Add 5 missing translation keys

