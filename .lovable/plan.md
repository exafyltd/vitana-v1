

## Problem

On iPhone, updating the profile picture via the Identity editor appears to succeed (upload completes, save shows success toast) but the avatar doesn't actually change. Two iOS-specific issues cause this:

### 1. Dynamically created file input is unreliable on iOS Safari

`handleAvatarUpload` creates a detached `<input type="file">` via `document.createElement`, attaches an async `onchange` handler, and calls `.click()`. On iOS Safari, when the photo picker opens, the page may lose context of the detached element. The `onchange` async handler can be interrupted or the `File` reference can become invalid before the upload completes — the upload appears to work but may silently fail or the state update (`setAvatarUrl`) may not persist.

### 2. File not materialized before upload

Per the project's established mobile upload pattern (see memory), files should be read into an `ArrayBuffer`/`Blob` before transmission to prevent `Failed to fetch` errors on mobile. The avatar upload passes the raw `File` object directly, bypassing this safeguard.

## Plan

**File: `src/components/profile/editor/IdentityForm.tsx`**

### A. Replace dynamic file input with a persistent `<input ref>` in JSX

Add a `useRef<HTMLInputElement>` and render a hidden `<input type="file">` in the component's JSX. The upload button triggers `ref.current.click()`. The `onChange` handler reads the file. This is the reliable pattern for iOS Safari.

### B. Materialize file into Blob before upload

In the onChange handler, read the selected file into an `ArrayBuffer`, create a new `Blob` with the correct MIME type, and pass that to `uploadFile`. This prevents iOS from invalidating the file handle mid-upload.

### C. Add explicit `contentType` to the storage upload

Set `contentType: file.type` in the upload options (matching the project's storage convention) to ensure iOS-taken photos have correct MIME types.

### Summary of changes

| What | Where |
|------|-------|
| Replace `document.createElement('input')` with persistent `<input ref>` in JSX | `IdentityForm.tsx` |
| Materialize file to ArrayBuffer/Blob before upload | `IdentityForm.tsx` |
| Add explicit `contentType` to storage upload call | `IdentityForm.tsx` |

Single file changed. No database or RLS changes needed.

