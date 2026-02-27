

## Fix: Left-align sidebar drawer nav item labels

**Root cause**: `App.css` sets `#root { text-align: center }`. The nav item label `<span className="flex-1">` inherits this, centering text within its flex-expanded width.

### Change in `src/components/mobile/SideDrawerNav.tsx`

**Line 232**: Add `text-left` to the span:
```tsx
// Before:
<span className="flex-1">{translate(item.translationKey)}</span>

// After:
<span className="flex-1 text-left">{translate(item.translationKey)}</span>
```

One-line fix.

