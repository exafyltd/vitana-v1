

## Show Share Button for Non-Creators, Kebab Menu for Creators/Co-Creators

Currently, `EventKebabMenu` always renders a kebab (three-dot) dropdown. For non-creators who only see "Share" inside it, this is unnecessary — they should see a direct Share icon button instead.

### Changes

**`src/components/events/EventKebabMenu.tsx`**

Add conditional rendering logic:
- If user is **not** a creator or co-creator (`!canEdit && !canDelete`), render a standalone `Share2` icon button (same size/style as the kebab) that directly calls `onShare`. No dropdown needed.
- If user **is** a creator/co-creator, render the existing kebab menu with Edit, Share, and Delete options as today.
- Import `Button` from ui/button for the standalone share button.

```tsx
// Non-creator: render a direct share button, no kebab
if (!canEdit && !canDelete) {
  if (!onShare) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 hover:bg-sidebar-accent/50 ${className}`}
      aria-label="Share event"
      onClick={(e) => { e.stopPropagation(); onShare(event); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}

// Creator/co-creator: render full kebab menu (existing code)
return ( <KebabMenu ...> ... </KebabMenu> );
```

This single change applies everywhere the component is used — drawer (mobile + desktop), card grids, and carousels — with no changes needed in parent components.

### Files to Change
1. `src/components/events/EventKebabMenu.tsx` — add conditional Share-only button for non-creators

