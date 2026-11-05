/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the safe Markdown subset of Vitana's chat replies (src/lib/chatMarkdown.ts: parseChatMarkdown, parseChatInline). Pure, IO-free: the native bubble renders the parsed blocks as React Native nodes, never HTML.
 */
export * from '@/lib/chatMarkdown';
