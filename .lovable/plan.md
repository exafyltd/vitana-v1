
# Fix Live Rooms Build Errors

## 6 TypeScript errors to resolve across 2 files

### 1. LiveRooms.tsx - Fix useMyRoom() usage (line 51)

`useMyRoom()` returns a React Query result, not the response directly. The destructuring `{ room: myRoom }` is invalid.

**Fix**: Change to use the query result properly:
```
const myRoomQuery = useMyRoom();
const myRoom = myRoomQuery.data?.room;
```

### 2. LiveRooms.tsx - Add `status` to LiveRoom interface in LiveRoomCard.tsx (lines 92, 118)

The `LiveRoom` interface in `LiveRoomCard.tsx` is missing `status`. The `transformStreamToRoom` function tries to assign it.

**Fix**: Add `status?: 'scheduled' | 'live' | 'ended' | 'cancelled'` to the `LiveRoom` interface in `LiveRoomCard.tsx`.

### 3. LiveRoomViewer.tsx - Fix missing properties on LiveRoomSession (lines 120, 131, 195)

The component references `stream_type`, `enable_recording`, and `session_description` on `LiveRoomSession`, but those fields aren't in the type definition.

**Fix**: Add these optional fields to the `LiveRoomSession` interface in `liveRoomService.ts`:
- `stream_type?: string`
- `enable_recording?: boolean`
- `session_description?: string`

These fields are sent via `CreateSessionRequest` and stored in session metadata, so adding them to the session type makes the data flow consistent.

---

## Files to modify

| File | Change |
|------|--------|
| `src/services/liveRoomService.ts` | Add `stream_type`, `enable_recording`, `session_description` to `LiveRoomSession` interface |
| `src/components/liverooms/LiveRoomCard.tsx` | Add `status?` property to `LiveRoom` interface |
| `src/pages/community/LiveRooms.tsx` | Fix `useMyRoom()` destructuring to use `.data?.room` |
