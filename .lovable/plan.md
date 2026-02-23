

## Inbox Mobile Improvements (3 Changes)

### 1. Avatar tap navigates to profile (Conversation List)

In `MobileConversationCard.tsx`, the avatar is currently a plain `<Avatar>` inside the card button. Tapping anywhere on the card opens the conversation. We need the avatar to independently navigate to the user's profile.

**File: `src/components/messages/mobile/MobileConversationCard.tsx`**
- Add `useNavigate` from react-router-dom
- Add a new prop `participantHandle?: string` (for `/u/:handle` routing)
- Replace the plain `<Avatar>` with `<ClickableAvatar>` from `@/components/ui/clickable-avatar`
- The `ClickableAvatar` onClick calls `e.stopPropagation()` internally and navigates to `/u/:identifier`
- Pass `userId={participantUserId}` and `handle={participantHandle}` to enable profile navigation

The parent component that renders `MobileConversationCard` will also need to pass the `participantHandle` prop if available from the thread participant data.

### 2. Compact conversation header with icon-only call buttons

Currently, `MessageThreadCallButtons` renders two outlined buttons with text labels ("Call", "Video Call") plus presence dots -- taking significant horizontal space and height. The screenshot shows they dominate the header bar.

**File: `src/components/MessageThreadCallButtons.tsx`**
- Change both buttons from `size="sm"` with text labels to `size="icon"` with icon-only rendering
- Remove the text labels ("Call", "Video Call") -- keep only the Phone and Video icons
- Change from `variant="outline"` to `variant="ghost"` for a cleaner look
- Reduce the container gap from `gap-2` to `gap-1`
- Remove the redundant presence indicator dots (they duplicate the avatar presence)
- Make the buttons `h-8 w-8` for a more compact touch target

This makes the header bar significantly shorter and cleaner, matching modern messenger aesthetics.

### 3. Show date + time on message timestamps

Currently, `MessageBubble.tsx` line 601 formats timestamps as `format(new Date(message.created_at), 'HH:mm')` -- showing only the time (e.g., "10:18").

**File: `src/components/messages/MessageBubble.tsx`**
- Import `isToday`, `isYesterday`, `isThisYear` from `date-fns`
- Replace the static `'HH:mm'` format with a smart date+time format:
  - Today: "10:18" (time only, same as now)
  - Yesterday: "Yesterday, 10:18"
  - This year: "23 Feb, 10:18" (short date + time)
  - Older: "23 Feb 2025, 10:18" (full date + time)
- This gives users full context on when messages were sent without cluttering today's messages

### Technical Details

**MobileConversationCard changes:**
```tsx
// Replace Avatar with ClickableAvatar
<ClickableAvatar
  userId={participantUserId}
  src={avatarUrl}
  fallback={name?.[0]?.toUpperCase() || '?'}
  className="w-12 h-12"
  onClick={(e) => e.stopPropagation()} // prevent card click
/>
```

**MessageThreadCallButtons compact layout:**
```tsx
<div className="flex gap-1">
  <Button variant="ghost" size="icon" className="h-8 w-8" ...>
    <Phone className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" className="h-8 w-8" ...>
    <Video className="h-4 w-4" />
  </Button>
</div>
```

**Smart timestamp logic:**
```tsx
const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
  if (isThisYear(date)) return format(date, 'd MMM, HH:mm');
  return format(date, 'd MMM yyyy, HH:mm');
};
```

