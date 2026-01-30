

## Keep Event Detail Drawer Open While Showing Dialogs

### Problem

The user wants to keep the event detail drawer visible in the background when clicking the Share or Promote buttons. Currently, the drawer closes before the dialog opens.

### Solution

Instead of closing the drawer first (which was done to avoid z-index conflicts), we will:

1. **Remove the drawer close calls** from Share and Promote button handlers
2. **Increase the z-index of dialogs** so they render above the Sheet/Drawer

### Technical Details

The Sheet component uses `z-50` for both its overlay and content. The Dialog component also uses `z-50`. When both are open, they fight for precedence, causing the dialog to appear behind the drawer.

The fix is to apply `z-[60]` to the DialogContent for both Share and Campaign dialogs, ensuring they stack above the drawer.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Remove `onOpenChange(false)` from Share and Promote button onClick handlers |
| `src/components/sharing/UniversalShareDialog.tsx` | Add `className` with `z-[60]` to DialogContent and `overlayClassName="z-[60]"` to ensure it renders above the drawer |
| `src/components/sharing/CampaignDialog.tsx` | Add `className` with `z-[60]` to DialogContent and `overlayClassName="z-[60]"` to ensure it renders above the drawer |

### Implementation Details

#### 1. MeetupDetailsDrawer.tsx - Remove drawer close calls

**Share Button (around line 1481-1486):**
```tsx
// Before
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onOpenChange(false);  // Remove this line
  onShareEvent?.(event);
}}

// After
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onShareEvent?.(event);
}}
```

**Promote Button - Desktop (around line 1397-1402):**
```tsx
// Before
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onOpenChange(false);  // Remove this line
  onPromoteEvent(event);
}}

// After
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onPromoteEvent(event);
}}
```

**Promote Button - Mobile (around line 1379-1384):**
```tsx
// Before
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onOpenChange(false);  // Remove this line
  onPromoteEvent(event);
}}

// After
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onPromoteEvent(event);
}}
```

#### 2. UniversalShareDialog.tsx - Increase z-index

```tsx
// Line ~195
// Before
<DialogContent className="max-w-2xl">

// After
<DialogContent className="max-w-2xl z-[60]" overlayClassName="z-[60]">
```

#### 3. CampaignDialog.tsx - Increase z-index

Find the DialogContent component and add z-index:
```tsx
// Before
<DialogContent className="...existing classes...">

// After  
<DialogContent className="...existing classes... z-[60]" overlayClassName="z-[60]">
```

### Expected Result

After these changes:

| Action | Behavior |
|--------|----------|
| Click Share button | Share dialog opens ON TOP of the drawer (drawer stays visible but dimmed) |
| Click Promote button | Campaign dialog opens ON TOP of the drawer (drawer stays visible but dimmed) |
| Close dialog | Returns to the drawer view |
| Mobile | Same behavior - dialogs layer above the drawer |

### Technical Notes

- The `overlayClassName="z-[60]"` is important because it ensures both the dialog overlay AND content render above the drawer's overlay (z-50)
- The Dialog component in this codebase supports an `overlayClassName` prop that gets passed to `DialogOverlay`
- This layering approach is cleaner than using portals or DOM manipulation

