

## Plan: Fix Edit Mode Keyboard Avoidance on Mobile

### Problem
When tapping Edit on mobile, the soft keyboard opens and covers the editing textarea and Save/Cancel buttons. The user must manually scroll to see them.

### Changes — `src/components/messages/MessageBubble.tsx`

**1. Add a ref to the edit container and scroll into view after render + keyboard open**

- Add `const editContainerRef = useRef<HTMLDivElement>(null);`
- When `isEditing` becomes `true`, use a `useEffect` to:
  1. Immediately call `editContainerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })`
  2. Subscribe to `window.visualViewport?.addEventListener('resize', ...)` to re-scroll when the keyboard actually appears (viewport shrinks)
  3. Clean up the listener when editing ends

```typescript
useEffect(() => {
  if (!isEditing || !isMobile) return;
  
  const scrollToEdit = () => {
    editContainerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  
  // Initial scroll after a tick (let DOM update)
  const t = setTimeout(scrollToEdit, 100);
  
  // Re-scroll when keyboard opens (viewport resizes)
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', scrollToEdit);
    vv.addEventListener('scroll', scrollToEdit);
  }
  
  return () => {
    clearTimeout(t);
    if (vv) {
      vv.removeEventListener('resize', scrollToEdit);
      vv.removeEventListener('scroll', scrollToEdit);
    }
  };
}, [isEditing, isMobile]);
```

**2. Attach ref to the edit container div**

On line 748, add the ref:
```tsx
<div ref={editContainerRef} className="p-2 space-y-2">
```

**3. Delay autoFocus to after scroll positioning**

Remove `autoFocus` from the textarea. Instead, focus programmatically inside the effect after the initial scroll, with a slight delay (~150ms) so the scroll completes first.

This approach:
- Scrolls the edit area into view immediately
- Re-scrolls when the keyboard appears (visualViewport resize)
- Works inside the scroll container (scrollIntoView walks up to the nearest scrollable ancestor)
- No layout changes for normal browsing — only activates when `isEditing && isMobile`
- Cleans up listeners when editing ends

### Files Modified
- `src/components/messages/MessageBubble.tsx` — add ref, useEffect for scroll+keyboard, remove autoFocus

