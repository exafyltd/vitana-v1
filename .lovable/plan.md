

## Fix Mobile Event Details Icon Buttons

### Problem

The icon buttons in the mobile Event Details sticky bar (Promote, Calendar, Share, Save) are not responding to taps. Only the main CTA button works. This is visible in the screenshot where tapping these buttons does nothing.

### Root Cause

When using Radix UI Sheet (which is a Dialog primitive) on mobile, nested interactive components like DropdownMenu and child Dialogs have portal/focus issues:

1. **Calendar button**: Uses DropdownMenu which creates its own portal. By default, DropdownMenu uses `modal={true}`, which can conflict with the parent Sheet's focus trap
2. **Share button**: Opens UniversalShareDialog (another Dialog), creating a modal-in-modal situation
3. **Promote button**: Calls `onPromoteEvent` which opens CampaignDialog - same modal-in-modal issue
4. **Save button**: Direct onClick should work, but may be affected by event propagation issues

### Solution

1. **Add `modal={false}` to DropdownMenu** on mobile to prevent focus trap conflicts
2. **Add explicit touch event handling** with `onClick` that doesn't conflict with the parent
3. **Ensure all button onClick handlers properly prevent propagation** where needed
4. **For nested dialogs (Share, Promote)**: These should work since they use their own portals, but we need to ensure the state setters are being called

### Files to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add `modal={false}` to Calendar DropdownMenu on mobile, ensure all button handlers work |

### Implementation Details

#### 1. Calendar DropdownMenu - Add modal={false} on mobile

```tsx
// Line ~1349
<DropdownMenu modal={!isMobile}>
  <DropdownMenuTrigger asChild>
    // ... Calendar button
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    // ... menu items
  </DropdownMenuContent>
</DropdownMenu>
```

#### 2. Share Button - Add explicit onClick with proper handling

```tsx
// Line ~1397
<Button 
  variant="outline" 
  size="icon"
  // ... className and style
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    setShareDialogOpen(true);
  }}
  aria-label="Share meetup"
>
```

#### 3. Save Button - Add explicit onClick with proper handling

```tsx
// Line ~1423
<Button
  variant="outline"
  size="icon"
  // ... className and style
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    handleSave();
  }}
  aria-label={isSaved ? "Remove from saved" : "Save for later"}
>
```

#### 4. Calendar Menu Items - Add proper mobile event handling

```tsx
<DropdownMenuItem 
  onClick={(e) => {
    e.stopPropagation();
    handleExportToCalendar('google');
  }}
>
  Google Calendar
</DropdownMenuItem>
// ... similar for other items
```

### Technical Notes

- The `modal={false}` prop on DropdownMenu prevents it from creating a focus trap, which conflicts with the Sheet's focus trap on mobile
- Adding `e.stopPropagation()` and `e.preventDefault()` ensures touch events don't bubble up to parent handlers
- The existing `handleExportToCalendar`, `setShareDialogOpen`, and `handleSave` functions are correctly implemented - they just need proper event handling to be triggered on mobile

### Expected Result

After these changes:
- Tapping the Calendar icon opens the dropdown with calendar export options
- Tapping the Share icon opens the UniversalShareDialog
- Tapping the Promote icon (for event creators) opens the CampaignDialog  
- Tapping the Save icon toggles the saved state
- All actions work identically to desktop, just adapted for touch

