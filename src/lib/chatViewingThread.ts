/**
 * VTID-05200 (chat-ux): a message that arrives for the conversation the member
 * has open, while the app is focused, is read on arrival — the optimistic
 * unread badge must not be bumped for it.
 *
 * Suppression is optimistic only: the server-side read state still converges
 * through `markAsRead` (ConversationView, debounced), which also clears the
 * `user_notifications` row. Local notifications are not gated here —
 * `notifyNewMessage` already returns when the app is foregrounded.
 */
export function isViewingThread(opts: {
  isForeground: boolean;
  activeThreadId: string | null | undefined;
  threadId: string;
}): boolean {
  return opts.isForeground && !!opts.activeThreadId && opts.activeThreadId === opts.threadId;
}
