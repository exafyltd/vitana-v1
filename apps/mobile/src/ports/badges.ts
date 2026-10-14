/**
 * VTID-05186 (N3, Interfaces I-SH.3) — badge counts the shell shows (inbox
 * unread, notifications, cart). Screen lanes register a hook per key at
 * startup; until one does, the count is 0 and no badge renders.
 */
export type BadgeKey = 'inboxUnread' | 'notificationsUnread' | 'cartCount';

const sources = new Map<BadgeKey, () => number>();

export function registerBadgeSource(key: BadgeKey, useCount: () => number): void {
  sources.set(key, useCount);
}

export function __clearBadgeSourcesForTests(): void {
  sources.clear();
}

const zero = () => 0;

/**
 * Registration happens before the shell renders (module load of a lane), so
 * the hook a key resolves to is stable for the app's lifetime.
 */
export function useBadge(key: BadgeKey): number {
  const useCount = sources.get(key) ?? zero;
  return useCount();
}
