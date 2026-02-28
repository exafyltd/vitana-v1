## Chat / Direct Messaging — Gateway API Rewire

### Summary
Rewired the Inbox (Postfach) data layer from direct Supabase queries to the gateway chat API at `VITE_GATEWAY_BASE`. UI layout, tabs, routes, and styling are **unchanged**.

### Architecture

```
Messages.tsx → useHybridMessages → useGlobalMessages → useChatApi → GET/POST gateway/api/v1/chat/*
                                                                   + Supabase Realtime on chat_messages
```

### Files Created
- **`src/hooks/useChatApi.ts`** — Pure REST client (fetchConversations, fetchConversation, sendChatMessage, markChatRead, fetchUnreadCount)
- **`src/hooks/useChatUnreadCount.ts`** — Polls GET /unread-count + listens to Realtime INSERT on chat_messages for live badge

### Files Modified
- **`src/hooks/useGlobalMessages.ts`** — Complete rewrite of data fetching:
  - Threads query → `GET /api/v1/chat/conversations` + profile enrichment
  - Messages query → `GET /api/v1/chat/conversation/:peerId` (reversed to ascending)
  - sendMessage → `POST /api/v1/chat/send`
  - markAsRead → `POST /api/v1/chat/read`
  - Realtime → `chat_messages` table filtered by `receiver_id=eq.${userId}`
  - createThread → virtual thread creation (peer = thread ID)
- **`src/components/mobile/SideDrawerNav.tsx`** — Added unread count badge on "Postfach" nav item

### Data Shape Mapping
- Gateway `peer_id` → Thread `id`
- Gateway `content` → `body`
- Gateway `sender_id/receiver_id` → participants array (enriched from profiles table)
- All conversations are `type: 'direct'`

### Prerequisites
- Users MUST have `active_tenant_id` in their JWT `app_metadata` or gateway calls will fail with `400 TENANT_REQUIRED`
- `VITE_GATEWAY_BASE` env var must be set
