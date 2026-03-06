

## Move Kebab Menu to Right Corner & Make More Visible in Drawer

### Change

**`src/components/meetups/MeetupDetailsDrawer.tsx`** (lines 802-812)

Move the desktop kebab menu from `right-14` to `right-4` (true right corner) and make it more visible with a semi-transparent dark background circle:

```tsx
{!isMobile && (
  <div className="absolute top-4 right-4 z-[60]">
    <EventKebabMenu
      event={event}
      currentUserId={user?.id}
      onEdit={...}
      onDelete={...}
      onShare={onShareEvent}
      className="text-white bg-black/40 hover:bg-black/60 rounded-full h-9 w-9"
    />
  </div>
)}
```

This positions it flush to the right corner (matching the close button style on mobile) and adds a dark semi-transparent backdrop so the dots are visible against any hero image.

