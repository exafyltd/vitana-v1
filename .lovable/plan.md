

## Fix: iOS Screen Enlarges After Sending a Message

### Root Cause

On iOS Safari, when a text input has a font-size smaller than 16px, the browser automatically zooms in when the input receives focus. The message composer textarea uses Tailwind's `text-sm` class (14px font-size). After sending a message, the code at line 193 of `MessageInput.tsx` calls `textareaRef.current.focus()`, which re-triggers this iOS auto-zoom -- causing the viewport to appear "enlarged" and exceed the screen.

### Fix (2 changes)

**1. `index.html` -- Prevent iOS auto-zoom globally**

Update the viewport meta tag (line 5) to include `maximum-scale=1`:

```
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
```

This prevents Safari from auto-zooming when any input is focused, regardless of font size. This is standard practice for web apps that manage their own layout (WhatsApp Web, Telegram, etc.).

**2. `src/components/messages/MessageInput.tsx` -- Set textarea font to 16px on mobile**

As a defense-in-depth measure, override the textarea's font-size to 16px on iOS to avoid the zoom trigger even if the viewport meta is later changed:

On the Textarea element (line 579), add an explicit `text-base` (16px) class so that even without the viewport restriction, iOS won't zoom. The change is minimal:

```
className="min-h-[24px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 text-base"
```

This replaces the inherited `text-sm` (14px) from the Textarea component's default with `text-base` (16px), which is the threshold below which iOS triggers zoom.

### What stays the same

- Desktop appearance is unaffected (16px vs 14px is a subtle change)
- All other form inputs across the app benefit from the viewport meta fix
- Send behavior, focus management, and auto-resize logic unchanged
