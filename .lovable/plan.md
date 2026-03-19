

## Fix: Attachments Cannot Be Opened (Expired Signed URLs)

### Problem
The `chat-attachments` storage bucket is private. When a file is uploaded, a signed URL (1-hour expiry) is stored in the message's `content_data.attachments[].url`. When the message is displayed — even moments later by the sender, or by the receiver — this URL has either expired or is about to expire. Clicking the file chip or image does nothing useful because it points to a dead URL.

The storage `path` IS correctly saved in each attachment object, but `MessageBubble.tsx` never uses it to generate a fresh signed URL.

### Solution

**File: `src/components/messages/MessageBubble.tsx`**

1. **Add a signed URL resolution layer** — When rendering attachments, check if the URL is a Supabase signed URL (contains `/object/sign/`). If so, use the stored `attachment.path` to generate a fresh signed URL via `getSignedAttachmentUrl(path)` before opening/downloading.

2. **Refactor `handleFileClick` and `handleDownload`** to accept an optional `path` parameter. When `path` is present, resolve a fresh signed URL before navigating.

3. **Refactor `handleImageClick`** similarly — resolve a fresh URL before showing the zoom modal.

4. **Cache resolved URLs in component state** (`Map<string, string>`) so repeated clicks don't re-fetch, and pre-resolve URLs on mount/message change for images so they render immediately.

5. **Update `renderAttachment`** to pass `attachment.path` to all click handlers and use resolved URLs for image `src`.

### Technical Detail

```text
Current flow:
  Upload → signedUrl (1hr) → stored in content_data.url → displayed → EXPIRED

Fixed flow:
  Display → check if path exists → getSignedAttachmentUrl(path) → fresh URL → display/open
  Cache fresh URL in component state for reuse within session
```

The fix uses the existing `getSignedAttachmentUrl()` from `src/lib/fileUpload.ts` which creates a 1-hour signed URL. URLs are resolved lazily on interaction (click) and eagerly for image thumbnails (on render).

### Files to modify
- `src/components/messages/MessageBubble.tsx` — Add URL resolution logic, update all attachment handlers

