# Design — Messenger: paste screenshots, Enter sends on desktop

All changes live in `src/components/messages/MessageInput.tsx` (689 lines on origin/main 5c4632ea9).

## 1. Paste → attachment (R1)
- Extract the body of `handleFileSelect` (lines ~285–377) into `uploadFiles(files: File[])`; `handleFileSelect`
  becomes `uploadFiles(Array.from(e.target.files || []))` plus the input reset. No behaviour change for the picker.
- New `handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>)` on the `<Textarea>`:
  - `files = Array.from(e.clipboardData.files)`; if empty, fall back to `e.clipboardData.items` with
    `kind === 'file'` → `getAsFile()` (Safari/older Chromium only fill `items`).
  - If `files.length === 0` or `e.clipboardData.getData('text/plain').trim() !== ''` → return (default text paste).
  - Otherwise `e.preventDefault()` and `uploadFiles(files.map(renameIfGeneric))`.
  - `renameIfGeneric(file)`: when the name is empty or matches `/^image\.(png|jpe?g|gif|webp)$/i`, return
    `new File([file], 'screenshot-<yyyyMMdd-HHmmss>.<ext>', { type: file.type })` (ext from mime, default `png`).
- Disabled/uploading states: paste is ignored when `disabled`, same as the picker button.

## 2. Enter (R2)
- `const sendsOnEnter = useMediaQuery('(hover: hover) and (pointer: fine)')` — a small local `matchMedia` hook with a
  change listener (no new dependency; `src/hooks/use-mobile.tsx` uses width, which is wrong here: a narrow desktop
  window still has a keyboard, a wide tablet does not).
- Move Enter handling into `onKeyDown` (keypress is deprecated) after the mention handler:
  1. mention handler consumed the key → stop (existing flag logic kept for the keypress path).
  2. `e.nativeEvent.isComposing || e.keyCode === 229` → return.
  3. `sendsOnEnter && e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey` →
     `e.preventDefault()`; if `canSend` → `handleSend()` (the existing `sendingLockRef` prevents double sends).
  4. otherwise default (new line).
- `enterKeyHint={sendsOnEnter ? 'send' : 'enter'}`.

## 3. Tests
- Vitest (jsdom, `matchMedia` mocked per case):
  - new `MessageInput.paste-enter.vtid-<VTID>.test.tsx`: desktop Enter sends once; Shift+Enter does not send; empty
    Enter does nothing; IME Enter does not send; touch Enter does not send and lets the newline through; enterkeyhint
    per device; paste of an image file calls `uploadChatAttachment` with the renamed file and shows the preview; paste
    with text does not upload; paste of a disallowed type shows the error toast.
  - `MessageInput.enter-newline.vtid-04966.test.tsx` and `MessageInput.mentions.vtid-04926.test.tsx`: pinned to the
    touch device (their contract still holds there); one desktop case added to the mentions test (Enter on an open
    list picks, does not send). This is an intentional contract change on desktop, stated in the PR.
- Staging (read-only, Playwright, same in-browser group injection as `vtid-04966-enter-newline.staging.spec.ts`):
  desktop project — Shift+Enter makes two lines, Enter *attempts* `POST` of the message (the staging guard aborts it,
  nothing written); paste a PNG via a synthetic `ClipboardEvent` with the storage upload route answered in the browser
  (`route.fulfill`, nothing reaches storage) → preview chip appears. Touch project (`hasTouch`, coarse pointer) — the
  existing VTID-04966 assertions. The 04966 spec is folded into the new spec and removed.
