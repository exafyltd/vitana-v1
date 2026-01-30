
## Fix Mobile Event Details Icon Buttons (Complete Solution)

### Problem Summary

The Calendar dropdown menu opens on mobile, but tapping on the menu items (Google Calendar, Outlook, Apple Calendar, Download ICS) does nothing. The Share and Save buttons also don't work as expected. The user confirmed that "functionalities should be the same as desktop, only adapted to mobile view."

### Root Cause Analysis

When Radix UI's `DropdownMenu` is nested inside a `Sheet` (which is a Dialog primitive), several issues occur on mobile:

1. **Focus Trap Conflict**: The Sheet's focus trap interferes with the DropdownMenu's portal
2. **Touch Event Interception**: The overlay and parent touch handlers capture events before they reach menu items
3. **Pointer Events**: The dropdown content needs explicit `pointer-events-auto` to receive touch events
4. **onSelect vs onClick**: Radix recommends using `onSelect` for DropdownMenuItem, which handles both click and keyboard selection

Looking at the working `KebabMenu` component, we can see the pattern that works:
```tsx
<DropdownMenu modal={false}>
  <DropdownMenuContent
    onCloseAutoFocus={(e) => e.preventDefault()}
    className="... pointer-events-auto"
    onClick={(e) => e.stopPropagation()}
  >
```

### Solution

Apply the proven pattern from KebabMenu to the Calendar dropdown and fix the Share/Save buttons:

**File: `src/components/meetups/MeetupDetailsDrawer.tsx`**

| Change | Location | Description |
|--------|----------|-------------|
| Add pointer-events-auto | DropdownMenuContent | Enable touch events on the menu |
| Add onCloseAutoFocus | DropdownMenuContent | Prevent auto-focus issues |
| Add onClick stopPropagation | DropdownMenuContent | Prevent bubbling to overlay |
| Use onSelect instead of onClick | DropdownMenuItem | Use Radix's recommended event |
| Add onPointerDown handlers | Share/Save buttons | Capture touch events early |

### Implementation Details

#### 1. Calendar Dropdown - Full Fix

```tsx
<DropdownMenu modal={!isMobile}>
  <DropdownMenuTrigger asChild>
    <Button 
      variant="outline" 
      size="icon" 
      className={cn(
        "shrink-0 flex items-center justify-center",
        isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12"
      )}
      style={isMobile ? {
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(0, 0, 0, 0.08)'
      } : undefined}
      onPointerDown={(e) => isMobile && e.stopPropagation()}
      aria-label="Add to calendar"
    >
      <Calendar className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent 
    align="end" 
    className="w-48 z-[100] pointer-events-auto"
    onCloseAutoFocus={(e) => e.preventDefault()}
    onClick={(e) => e.stopPropagation()}
  >
    <DropdownMenuItem onSelect={() => handleExportToCalendar('google')}>
      Google Calendar
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => handleExportToCalendar('outlook')}>
      Outlook
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => handleExportToCalendar('apple')}>
      Apple Calendar
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => handleExportToCalendar('ics')}>
      <Download className="h-4 w-4 mr-2" />
      Download ICS
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 2. Share Button - Add Touch Handling

```tsx
<Button 
  variant="outline" 
  size="icon" 
  className={cn(
    "shrink-0 flex items-center justify-center",
    isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12"
  )}
  style={isMobile ? {
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.08)'
  } : undefined}
  onPointerDown={(e) => {
    if (isMobile) {
      e.stopPropagation();
    }
  }}
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    setShareDialogOpen(true);
  }}
  aria-label="Share meetup"
>
  <Share2 className="h-4 w-4" />
</Button>
```

#### 3. Save Button - Add Touch Handling

```tsx
<Button
  variant="outline"
  size="icon"
  className={cn(
    "shrink-0 flex items-center justify-center",
    isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12",
    isSaved && !isMobile && "bg-accent"
  )}
  style={isMobile ? {
    background: isSaved ? 'rgba(var(--accent), 0.9)' : 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.08)'
  } : undefined}
  onPointerDown={(e) => {
    if (isMobile) {
      e.stopPropagation();
    }
  }}
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    handleSave();
  }}
  aria-label={isSaved ? "Remove from saved" : "Save for later"}
>
  <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
</Button>
```

#### 4. Promote Button - Add Touch Handling (if present)

```tsx
<Button
  variant="outline"
  size="icon"
  className={cn(
    "shrink-0 flex items-center justify-center",
    isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12"
  )}
  style={isMobile ? {
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.08)'
  } : undefined}
  onPointerDown={(e) => {
    if (isMobile) {
      e.stopPropagation();
    }
  }}
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    onPromoteEvent(event);
  }}
  aria-label={translate('eventCta.promoteEvent', 'Promote event')}
>
  <Megaphone className="h-4 w-4" />
</Button>
```

### Technical Notes

| Technique | Why It Works |
|-----------|--------------|
| `modal={false}` | Prevents DropdownMenu from creating its own focus trap that conflicts with Sheet |
| `pointer-events-auto` | Ensures the dropdown portal receives touch events even when inside a Sheet |
| `onCloseAutoFocus={(e) => e.preventDefault()}` | Prevents focus issues when menu closes |
| `onSelect` vs `onClick` | Radix's official API for menu item selection - more reliable than onClick |
| `onPointerDown` with stopPropagation | Captures touch events early before they bubble to parent handlers |
| `onClick` with stopPropagation + preventDefault | Prevents Sheet overlay from intercepting the click |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Update Calendar dropdown, Share button, Save button, and Promote button with proper mobile touch handling |

### Expected Result

After these changes:
- Tapping "Google Calendar" in the dropdown opens Google Calendar in a new tab
- Tapping "Outlook" opens Outlook Calendar in a new tab  
- Tapping "Apple Calendar" / "Download ICS" shows the toast notification
- Tapping Share icon opens the UniversalShareDialog
- Tapping Save icon toggles the saved state with toast feedback
- Tapping Promote icon (for event creators) opens the CampaignDialog
- All buttons work identically to desktop, just adapted for touch
