

## Fix: Remaining Mobile Chat Scroll Stickiness

### Root Cause (the real one)

The height chain from `AppLayout` down to the message list is broken on mobile. Every flex-based scroll container requires an unbroken chain of constrained heights — if any ancestor uses `min-h-screen` instead of `h-screen`, or lacks `min-h-0`, the browser cannot compute when `overflow-y: auto` should activate.

Current chain (broken):
```text
AppLayout
  div.flex.min-h-screen          ← CAN GROW past viewport
    SidebarInset.flex-col
      div.flex-col.min-h-screen  ← CAN GROW past viewport
        main.flex-1              ← NO min-h-0, NO overflow constraint
          MobileAppShell
            div (paddingTop)     ← NO height, NO flex, NO overflow
              Messages page
                div.h-[calc(100dvh-200px)]  ← tries to constrain
                  ConversationView
                    div.chat-scroll.overflow-y-auto ← scroll never activates
```

Because two ancestors use `min-h-screen` (minimum, can grow) and `main` lacks `min-h-0`, the message list's `overflow-y: auto` intermittently fails — the browser thinks the container is taller than its content so there's nothing to scroll.

### Fixes (4 files)

**1. `src/components/AppLayout.tsx`** (line 453, 455)

Change the inner wrapper and main tag to constrain height:
```tsx
// Before:
<div className="flex flex-col min-h-screen bg-background rounded-tl-2xl">
  <main className="flex-1">

// After:
<div className="flex flex-col h-full min-h-0 bg-background rounded-tl-2xl">
  <main className="flex-1 min-h-0 overflow-hidden">
```

This is the critical missing link. `h-full` + `min-h-0` ensures the flex child can shrink, and `overflow-hidden` on `main` prevents content from pushing the layout beyond viewport.

**2. `src/components/mobile/MobileAppShell.tsx`** (the inner div, line ~33-37)

Add flex layout and height constraints to the wrapper div:
```tsx
// Before:
<div onTouchStart={...} onTouchEnd={...}
  style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}>
  {children}
</div>

// After:
<div onTouchStart={...} onTouchEnd={...}
  className="flex flex-col flex-1 min-h-0 overflow-hidden"
  style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}>
  {children}
</div>
```

**3. `src/pages/Messages.tsx`** (mobile chat container, line ~749-776)

Replace the fragile `h-[calc(100dvh-200px)]` with flex-based height for the mobile conversation view. The hardcoded 200px offset is unreliable across devices with different safe areas, address bars, and nav heights:
```tsx
// Before:
<div className="h-[calc(100dvh-200px)] flex flex-col min-h-0 overflow-hidden">

// After (mobile conversation content):
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
```

Apply the same change to the desktop panel container (line ~782).

**4. `src/components/messages/ConversationView.tsx`** (chat-scroll div, line ~1013)

Add iOS momentum scrolling support and remove redundant `touch-pan-y` (which can conflict with SwipeableMessage):
```tsx
// Before:
className="chat-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-1 overscroll-contain touch-pan-y"

// After:
className="chat-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-1 overscroll-contain"
style={{
  WebkitOverflowScrolling: 'touch',
  paddingBottom: isMobile ? 'var(--composer-h, 56px)' : undefined
}}
```

The `WebkitOverflowScrolling: 'touch'` enables native momentum scrolling on iOS WebView. The `touch-pan-y` removal prevents it from conflicting with the SwipeableMessage gesture handler (which already correctly cancels swipe when vertical movement dominates).

### What stays untouched
- `ConversationView.tsx` scroll logic (ref-based tracking, rAF throttling) — already fixed
- `SwipeableMessage.tsx` — already handles vertical-vs-horizontal correctly
- `useGlobalMessages.ts`, `chatPersistCache.ts` — correct
- `MobileBottomNav` — renders outside the flex chain, no conflict

