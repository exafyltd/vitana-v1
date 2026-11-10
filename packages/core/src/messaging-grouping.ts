/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — message grouping positions (src/lib/messaging/grouping.ts). Pure, IO-free: a run of one sender within five minutes on one day forms a group. The native chat list uses it like ConversationView / GroupChat.
 */
export * from '@/lib/messaging/grouping';
