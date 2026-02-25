

## Fix: Remove Excessive White Space in Conversation Thread (WhatsApp-density)

### Root Cause Analysis

The mobile conversation view (`Messages.tsx` line 902-918) renders as a `fixed inset-0` overlay with `paddingTop: calc(env(safe-area-inset-top) + 32px)`. This top padding reserves space for the TopAppBar, but the TopAppBar itself already handles its own safe-area padding. The result is a ~32px blank gap at the top. Additionally, the composer has no bottom safe-area padding, and there are unnecessary spacer divs.

### Changes

**1. `src/pages/Messages.tsx`** — Fix the mobile conversation overlay container

- Line 903-904: Change from `paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)'` to just `paddingTop: 'env(safe-area-inset-top, 0px)'` — the 32px was for the TopAppBar, but since this is a `fixed inset-0 z-50` overlay that covers the TopAppBar, only the bare safe-area inset is needed for the notch
- Change `fixed inset-0 z-50 flex flex-col bg-background` to use `h-[100dvh]` instead of relying on `inset-0` for height calculation
- Actually keep `inset-0` (it pins all edges) but ensure no extra wrappers add padding

**2. `src/components/messages/ConversationView.tsx`** — Tighten the layout

- Line 990: The root `div` uses `h-full` — keep this, it fills the parent correctly
- Line 1058: Messages scroll area has `px-4 py-3` — reduce `py-3` to `py-1` to minimize top/bottom gap in message list
- Line 1152: Remove `<div className="h-4" />` spacer — unnecessary dead space at bottom of messages
- Line 1157-1158: Composer wrapper — add bottom safe-area: `style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}`

**3. `src/components/messages/MessageInput.tsx`** — Reduce composer height variable

- Line 105: Change `Math.max(112, totalComposerHeight)` to `Math.max(56, totalComposerHeight)` — the 112px minimum is way too tall and was meant to be 56px per the previous redesign

### Summary of spacing impact

```text
BEFORE                              AFTER
┌─── safe-area ──────────────┐      ┌─── safe-area ──────────────┐
│                            │      │← [Av] Name         📞 🎥  │ ← header starts immediately
│ 32px blank gap             │      ├────────────────────────────┤
│← [Av] Name         📞 🎥  │      │                            │
├────────────────────────────┤      │   Messages (more space)    │
│   py-3 top gap             │      │                            │
│   Messages                 │      │                            │
│                            │      │                            │
│   h-4 spacer               │      ├────────────────────────────┤
├────────────────────────────┤      │ ╭────────────────╮    🎤   │
│ ╭────────────────╮    🎤   │      │ ╰────────────────╯         │
│ ╰────────────────╯         │      │ safe-area-bottom           │
│ no safe-area-bottom        │      └────────────────────────────┘
└────────────────────────────┘
```

Three files, purely CSS/layout changes. No logic changes.

