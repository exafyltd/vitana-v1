

## Make the media upload button more prominent in the Create Post sheet

The current implementation uses a small ghost icon button (`ImagePlus`) tucked in the bottom-left footer — hard to notice on mobile.

### Changes to `src/components/profile/mobile/MobileCreatePostSheet.tsx`

Replace the footer's small ghost icon button with a larger, visually distinct button that has a colored background, label text, and more padding:

**Current** (lines 149-151):
```tsx
<Button variant="ghost" size="icon" onClick={...} className="text-muted-foreground">
  <ImagePlus className="h-5 w-5" />
</Button>
```

**New**:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={...}
  className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 gap-1.5 px-4"
>
  <ImagePlus className="h-5 w-5" />
  <span className="text-sm font-medium">Foto / Video</span>
</Button>
```

This gives the button a tinted background, a visible border, icon + label text, and a pill shape — making it immediately recognizable as an action button rather than a subtle icon.

