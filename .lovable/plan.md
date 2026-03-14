

# Replace `useChatApi.ts` with updated gateway client

## What changes

Replace `src/hooks/useChatApi.ts` with the user-provided version that:

1. **New env var**: Uses `VITE_GATEWAY_URL` (fallback `/api/v1`) instead of `VITE_GATEWAY_BASE`. Add `VITE_GATEWAY_URL` to `.env` pointing to the same gateway.
2. **Cookie auth**: Switches from Bearer token (via `supabase.auth.getSession()`) to `credentials: "include"` cookie-based auth. Removes `supabase` import entirely.
3. **Extended ChatMessage type**: Adds `message_type?: string` and `metadata?: Record<string, unknown>` fields for voice transcript support.
4. **Simplified fetch**: Single `gatewayFetch` helper prepends `/chat` to paths. No Supabase fallback for unread count.
5. **Path consolidation**: API paths become short (`/conversations`, `/send`, etc.) since `gatewayFetch` builds the full URL as `${GATEWAY_BASE}/chat${path}`.

## Consumers (no breaking changes)

- `useGlobalMessages.ts` — imports `fetchConversations`, `fetchConversation`, `sendChatMessage`, `markChatRead`, `ChatMessage`, `ChatConversation`. All preserved with same signatures.
- `useChatUnreadCount.ts` — imports `fetchUnreadCount`. Same signature preserved. The Supabase fallback is removed; if gateway is unreachable the error propagates to the existing `catch` in the hook.

## Files to change

1. **`src/hooks/useChatApi.ts`** — Full rewrite with user-provided code
2. **`.env`** — Add `VITE_GATEWAY_URL` pointing to same value as `VITE_GATEWAY_BASE`

## Risk note

The Supabase fallback for `fetchUnreadCount` is removed. If the gateway is down, unread count will fail silently (the hook already catches errors). The `VITE_GATEWAY_BASE` env var remains for all other consumers; only this file switches to `VITE_GATEWAY_URL`.

