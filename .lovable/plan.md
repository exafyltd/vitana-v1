

# Update Chat Hooks for Vitana DM Integration

## Changes

### 1. Replace `src/hooks/useChatApi.ts`

The existing file uses `VITE_GATEWAY_BASE` with Bearer auth headers via Supabase session. The new version:
- Uses `VITE_GATEWAY_URL` (falling back to `/api/v1`) instead of `VITE_GATEWAY_BASE`
- Uses `credentials: "include"` (cookie auth) instead of explicit Bearer tokens
- Adds `message_type` and `metadata` fields to `ChatMessage` interface
- Removes the Supabase fallback for unread count and the `fetchUnreadCount` export
- Prepends `/chat` to all paths (e.g., `/chat/conversations` instead of `/api/v1/chat/conversations`)

**Impact**: `useGlobalMessages.ts` imports `fetchConversations`, `fetchConversation`, `sendChatMessage`, `markChatRead`, `ChatMessage`, `ChatConversation` — all preserved in the new API. However, `useChatUnreadCount.ts` imports `fetchUnreadCount` which is **removed** in the new version. We need to keep `fetchUnreadCount` to avoid breaking that consumer.

**Plan**: Write the new file as specified but **retain** the `fetchUnreadCount` function and its Supabase fallback, adapting it to use the new `gatewayFetch` helper.

### 2. Update `toGlobalMessage` in `src/hooks/useGlobalMessages.ts`

Line 76: Change `content_data: (msg as any).content_data || null` → `content_data: (msg as any).metadata || undefined`

This maps the database `metadata` column to the UI's `content_data` field so voice transcript messages render correctly.

Line 75 already reads `message_type` dynamically — no change needed there.

## Files Modified
- `src/hooks/useChatApi.ts` — full rewrite with retained `fetchUnreadCount`
- `src/hooks/useGlobalMessages.ts` — one-line change at line 76

