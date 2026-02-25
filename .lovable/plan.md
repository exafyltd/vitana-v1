

## Fix Share Profile Modal Scrolling on Mobile

### Problem
The `DialogContent` in `ShareProfileModal.tsx` has `overflow-hidden` on line 145, preventing scrolling. On mobile, the modal content (profile card + copy link + QR code + social buttons + view profile) overflows the viewport, making the top and bottom unreachable.

### Solution
**File: `src/components/profile/shared/ShareProfileModal.tsx`**

1. **Line 145**: Remove `overflow-hidden` from the `DialogContent` className
2. **Line 150**: Add `overflow-y-auto max-h-[80vh]` to the inner content `<div>` so the content area scrolls while the header stays fixed

One file, two class changes.

