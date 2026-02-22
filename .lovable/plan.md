

## Fix: Profile Image Upload and HEIC Handling

### Root Cause

The user uploaded a `.heic` image (iPhone default format) as their avatar. The current `avatar_url` in the database is:

```
.../avatars/05ce4a1d-.../avatar-1771756568001.heic
```

**HEIC files cannot be displayed by any major browser.** The upload succeeded (Supabase stored the file), but the image appears blank because `<img>` tags cannot render HEIC.

The `IdentityForm.tsx` file picker uses `accept="image/*"`, which on iOS includes HEIC files. There is no validation or conversion before upload.

### Storage Setup

The `avatars` bucket exists, is public, and has correct RLS policies (SELECT for public, INSERT/UPDATE/DELETE scoped to `auth.uid()` matching folder name). No storage changes needed.

---

### Changes (2 files)

#### File 1: `src/components/profile/editor/IdentityForm.tsx`

**Problem**: The file input accepts `image/*` which includes HEIC/HEIF. No validation rejects unsupported formats before upload.

**Fix**:

1. Change `input.accept` from `image/*` to explicit browser-safe formats: `image/jpeg,image/png,image/gif,image/webp,image/svg+xml` (line 99). This prevents HEIC from appearing in the file picker on most devices.

2. Add a validation guard after file selection (after line 101) that checks the file type and extension. If the file is HEIC/HEIF (by MIME type `image/heic`, `image/heif`, or file extension `.heic`/`.heif`), show a toast error telling the user to convert to JPG or PNG first, and return early without uploading.

3. Add a general fallback check: if the file type doesn't start with `image/` or is empty (some browsers don't report MIME for HEIC), check the extension against an allowlist of `jpg, jpeg, png, gif, webp, svg`. Reject anything else.

#### File 2: Database data fix

**Problem**: The user's current `avatar_url` points to a HEIC file that will never display.

**Fix**: Clear the broken `avatar_url` to empty string so the fallback initials avatar shows instead of a blank image. This is a data update for the specific user.

```sql
UPDATE profiles 
SET avatar_url = NULL 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'daniela.kueper0607@gmail.com'
);
```

---

### Summary

| Change | File | Why |
|--------|------|-----|
| Restrict file picker to browser-safe formats | `IdentityForm.tsx` line 99 | Prevents HEIC from being selectable |
| Add HEIC/HEIF validation with user-friendly error | `IdentityForm.tsx` lines 101-102 | Catches HEIC even if file picker filter is bypassed |
| Clear broken avatar_url for affected user | Database UPDATE | Restores visible fallback avatar immediately |

