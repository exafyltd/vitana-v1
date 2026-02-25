

## Fix: Differentiate Live Room drawer for Host vs Guest

### Problem

The `LiveRoomDrawer` component renders the same view for both the host/creator and guest viewers. When a host creates a scheduled room and opens its detail drawer, they see guest-oriented actions ("Follow", "Notify me") that don't apply to their own room. The host needs management controls instead.

### Current behavior

- **Host bar** (lines 319-350): Always shows the host avatar with a "Follow" button — even when the viewer IS the host.
- **Sticky action bar** (lines 448-497): For scheduled rooms, always shows "Notify me", calendar, and share — no host-specific actions like "Go Live", "Edit", or "Cancel".
- The `isCreator` prop exists but is only used to show a kebab menu (Edit/Delete) in the hero overlay (lines 267-294). It doesn't affect the main content or action bar.

### Changes — 1 file

**`src/components/liverooms/LiveRoomDrawer.tsx`**

#### 1. Host bar section (lines 318-351) — Hide "Follow" button for creator

Wrap the host bar in a conditional: if `isCreator`, show a simpler "Your Room" indicator instead of "Follow" button.

```tsx
// Host Bar — lines 318-351
{!isCreator ? (
  // Existing host bar with Follow button (unchanged)
  <div className="flex items-center gap-2 mt-3">
    <button onClick={handleFollow} className={cn(/* existing styles */)}>
      {/* avatar + name + Host badge */}
    </button>
    <Button onClick={handleFollow} variant={isFollowing ? "secondary" : "outline"} className="...">
      <UserPlus /> {isFollowing ? "Following" : "Follow"}
    </Button>
  </div>
) : (
  // Creator sees their own info without Follow
  <div className="flex items-center gap-2 mt-3">
    <div className="flex items-center gap-2 h-11 px-3 rounded-full bg-background/95 backdrop-blur-sm shadow-lg">
      <Avatar className="h-7 w-7 ring-1 ring-white/50">
        <AvatarImage src={room.host.avatar} />
        <AvatarFallback>{room.host.name[0]}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-semibold">{room.host.name}</span>
      <Badge variant="secondary" className="text-xs">Your Room</Badge>
    </div>
  </div>
)}
```

#### 2. Sticky action bar — Scheduled rooms (lines 462-495) — Different actions for host vs guest

Replace the single scheduled-room action block with a conditional:

**Host (isCreator) sees:**
- Primary "Go Live Now" button (calls `onJoin`) — allows starting early
- "Edit" button (calls `onEdit`)
- "Cancel Session" button (calls `onDelete` with confirmation)

**Guest (!isCreator) sees:**
- "Notify me" button (existing behavior)
- Calendar dropdown (existing)
- Share button (existing)

```tsx
{isScheduled ? (
  isCreator ? (
    // HOST action bar
    <div className="flex items-center gap-2">
      <Button size="lg" className="flex-1" onClick={handleJoin}>
        Go Live Now
      </Button>
      <Button size="lg" variant="outline" onClick={onEdit}>
        <Pencil className="w-4 h-4" />
      </Button>
      <Button size="lg" variant="outline" onClick={() => setShowDeleteDialog(true)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  ) : (
    // GUEST action bar (existing Notify me + Calendar + Share)
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button size="lg" variant="outline" className="flex-1" onClick={handleNotifyMe}>
          <Bell className={cn("w-4 h-4 mr-2", isNotifying && "fill-current")} />
          {isNotifying ? "Notifying" : "Notify me"}
        </Button>
        {/* Calendar dropdown + Share — unchanged */}
      </div>
    </div>
  )
) : null}
```

#### 3. Live room action bar (lines 450-461) — Host gets "End Room" instead of "Join"

When the room is live and the user is the creator:

```tsx
{room.isLive ? (
  isCreator ? (
    <div className="flex items-center gap-2">
      <Button size="lg" variant="destructive" className="flex-1" onClick={handleJoin}>
        End Room
      </Button>
      <Button size="lg" variant="outline" onClick={() => handleShare()}>
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  ) : (
    // Existing guest Join Room + Share + Bookmark
    <div className="flex items-center gap-2">
      <Button size="lg" className="flex-1" onClick={handleJoin}>Join Room</Button>
      {/* Share + Bookmark unchanged */}
    </div>
  )
) : /* scheduled block */ }
```

### Summary of role-based differences

```text
┌──────────────┬─────────────────────────┬─────────────────────────┐
│ Section      │ Host (isCreator)        │ Guest                   │
├──────────────┼─────────────────────────┼─────────────────────────┤
│ Host bar     │ "Your Room" badge       │ Follow button           │
│ Hero overlay │ ⋮ menu (Edit/Delete)    │ (none)                  │
│ Scheduled    │ Go Live / Edit / Cancel │ Notify me / Cal / Share │
│ Live         │ End Room / Share        │ Join Room / Share / Save│
└──────────────┴─────────────────────────┴─────────────────────────┘
```

