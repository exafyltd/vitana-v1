/**
 * VTID-05186 (N3, Interfaces I-SH.3) — badge counts the shell shows (inbox
 * unread, notifications, cart). Screen lanes register a hook per key at
 * startup; until one does, the count is 0 and no badge renders.
 *
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — `inboxUnread`
 * is registered here, at module load of this port (the shell imports it
 * before it renders the bottom bar): the inbox lane's native twin of the web
 * `useChatUnreadCount` (direct + group unread, realtime + 60 s reconcile), so
 * the bottom-bar and drawer badges count from app start like the web footer.
 */
import { useInboxUnreadCount } from '../screens/inbox/data/unread';

export type BadgeKey = 'inboxUnread' | 'notificationsUnread' | 'cartCount';

const sources = new Map<BadgeKey, () => number>();

export function registerBadgeSource(key: BadgeKey, useCount: () => number): void {
  sources.set(key, useCount);
}

export function __clearBadgeSourcesForTests(): void {
  sources.clear();
}

registerBadgeSource('inboxUnread', useInboxUnreadCount);

const zero = () => 0;

/**
 * Registration happens before the shell renders (module load of a lane), so
 * the hook a key resolves to is stable for the app's lifetime.
 */
export function useBadge(key: BadgeKey): number {
  const useCount = sources.get(key) ?? zero;
  return useCount();
}
