

## Two Issues Found

### Issue 1: Web Composer Portaled to Bottom of Screen
`ConversationView.tsx` lines 57-68: `ComposerDock` uses `createPortal(... document.body)` with `fixed left-0 right-0 bottom-0 z-[60]`. This was built for mobile (full-width dock) but on desktop it escapes the chat panel and spans the entire viewport width at the absolute bottom -- breaking the layout as shown in the screenshot.

**Fix**: Detect mobile in `ComposerDock`. On desktop, render children inline (no portal, no fixed positioning). On mobile, keep the portal behavior.

### Issue 2: Realtime Messages Not Appearing on Web
`useGlobalMessages.ts` line 634: The realtime subscription uses a static channel name `"chat_messages_realtime"`. However, `useGlobalMessages` is instantiated **twice** on the Messages page:
1. In `Messages.tsx` line 63 via `useHybridMessages(messageContext)` (thread list)
2. In `ConversationView.tsx` line 105 via `useHybridMessages(context, threadId)` (conversation)

Both create the same Supabase channel `"chat_messages_realtime"`. When either hook re-renders and its cleanup runs `supabase.removeChannel(channel)`, it kills the subscription for **both** instances. This means incoming messages from mobile are received intermittently or not at all.

**Fix**: Make the channel name unique per hook instance using a `useRef(crypto.randomUUID())` suffix, e.g. `"chat_messages_realtime_" + instanceId`. This ensures each subscription is independent and cleanup doesn't interfere.

### Files to Edit
1. `src/components/messages/ConversationView.tsx` -- Make `ComposerDock` conditional: inline on desktop, portal on mobile
2. `src/hooks/useGlobalMessages.ts` -- Unique realtime channel name per instance

