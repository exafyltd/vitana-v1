

## Multi-Photo Upload Support

Currently the upload dialog only allows selecting and uploading one photo at a time. This plan converts it to support batch selection and sequential upload.

### Changes

**1. `src/components/profile/gallery/PhotoUploadDialog.tsx` -- Support multiple files**

- Change state from single `file`/`preview` to arrays: `files: File[]` and `previews: string[]`
- Add `multiple` attribute to the file input
- Update drop handler to accept multiple files from `e.dataTransfer.files`
- Show a scrollable grid of preview thumbnails instead of a single image
- Each preview gets an X button to remove it from the batch
- Allow adding more files (clicking the drop zone again appends, doesn't replace)
- Optional: shared caption field applies to all photos, or no caption for batch
- Update the dropzone text to say "Select multiple photos"
- Submit button shows count: "Upload 5 Photos"

- On submit, call `onUpload` once per file sequentially
- Show a progress indicator (e.g., "Uploading 2 of 5...")
- Disable close/cancel while uploading is in progress

**2. `src/components/profile/gallery/PhotoGallery.tsx` -- Update `onUpload` prop type**

- Change `onUpload` prop to accept a batch: `(data: { file: File; caption?: string; is_public?: boolean }[]) => void`
- OR keep the single-file signature and let the dialog call it multiple times (simpler, no changes needed here)

Decision: Keep the existing single-file `onUpload` signature unchanged. The dialog will loop and call it for each file. This avoids changing the hook or any parent components.

**3. `src/hooks/useProfileGallery.ts` -- No changes needed**

The existing `uploadPhoto.mutateAsync` already handles one file at a time. The dialog will call it sequentially for each file in the batch.

### Technical Details

**State changes in PhotoUploadDialog:**
```
- file: File | null        -->  files: File[]
- preview: string | null   -->  previews: string[]
+ uploadProgress: { current: number; total: number } | null
```

**Submit flow:**
```
for (let i = 0; i < files.length; i++) {
  setUploadProgress({ current: i + 1, total: files.length });
  await onUpload({ file: files[i], caption, is_public: isPublic });
}
// reset and close
```

The `onUpload` prop type changes to return a Promise so we can await each upload:
```ts
onUpload: (data: { file: File; caption?: string; is_public?: boolean }) => void | Promise<void>
```

**Preview grid:** A 3-column grid of thumbnails inside the drop zone area, each with a small remove button. Max height with scroll if many photos selected.

