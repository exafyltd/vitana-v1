

## Fix: Shared File Opening + Multiple File Attachments

### Issue 1: Can't open shared screenshots/files
In `MessageBubble.tsx`, `handleFileClick` uses `window.open(url, '_blank')` which is frequently blocked by mobile browsers as a popup. The file chip click handler needs to use a more reliable method.

**Fix in `src/components/messages/MessageBubble.tsx`:**
- Change `handleFileClick` to use an anchor element click (`document.createElement('a')`) instead of `window.open`, which bypasses mobile popup blockers.

### Issue 2: Can only attach one file at a time
Two constraints prevent multi-file selection:

1. The `<input type="file">` in `MessageInput.tsx` (line 562-568) is missing the `multiple` attribute
2. `handleFileSelect` (line 249-250) explicitly takes only `files[0]` with the comment "Only allow one file at a time"

**Fix in `src/components/messages/MessageInput.tsx`:**
- Add `multiple` attribute to the file input element
- Update `handleFileSelect` to loop through all selected files and upload each one (sequentially, to show proper progress per file)

### Files to modify
- `src/components/messages/MessageBubble.tsx` — fix `handleFileClick`
- `src/components/messages/MessageInput.tsx` — add `multiple`, process all files

