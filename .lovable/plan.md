

## Remove Redundant Chat/Participants Sidebar -- Full-Screen Stream

The Daily.co video iframe already includes its own chat and participant UI. The right sidebar (Chat tab + Participants tab + message input) is redundant and steals ~384px from the video area. Removing it lets the stream fill the full width.

### What changes

**File: `src/pages/community/LiveRoomViewer.tsx`**

1. **Remove the entire right sidebar block** (lines 420-545 approx) -- the `w-96 border-l` div containing the Chat/Participants tabs, message list, participant list, and the message input bar at the bottom.

2. **Remove the "Ready to join?" modal card** (lines 362-381) -- the entry screen is unnecessary since clicking "Join Stream" / "Start Stream" just sets `isInRoom = true`. Instead, auto-join: set `isInRoom` to `true` by default so the Daily.co room loads immediately when the page opens.

3. **Clean up unused state and imports** that only served the sidebar:
   - `showParticipants` state
   - `newMessage` state  
   - `messagesEndRef` ref
   - `handleSendMessage` function
   - `messages` array (if only used in sidebar)
   - `MessageCircle` icon import (if no longer used elsewhere)

4. **Keep the reaction bar** (Heart, Like, End Room buttons) at the bottom -- those are not part of the sidebar and remain useful.

### Result

- The video area (`flex-1 flex flex-col`) will stretch to fill the entire width below the header
- No sidebar, no entry modal -- viewers land directly into the stream
- Host still sees "End Room" button in the reaction bar
- All chat/participants functionality is handled by Daily.co's built-in UI inside the iframe

### Technical detail

The layout parent is `flex-1 flex overflow-hidden` (line 322). Currently it contains two children: the video column (`flex-1`) and the sidebar (`w-96`). After removing the sidebar, the video column naturally fills 100% width.

