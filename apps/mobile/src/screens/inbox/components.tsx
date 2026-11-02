/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox list's
 * building blocks, native twins of the web mobile inbox components:
 *  - `ConversationCard` — `src/components/messages/mobile/MobileConversationCard.tsx`
 *    (48 px avatar, name + short time, last message, start-edge unread
 *    accent, round unread badge capped at "9+", pinned dot),
 *  - `ConversationSkeleton` — `MobileConversationSkeleton.tsx`,
 *  - `InboxEmptyState` — `MobileInboxEmptyState.tsx` (illustration, title,
 *    context description, "Start a conversation", "Discover people" → /community),
 *  - `RowErrorBoundary` — the `FeedItemErrorBoundary` around each row
 *    (Messages.tsx:1240-1247),
 *  - `InboxSubNav` + `InboxPage` — `SubNavigation items={messagesNavigation}`
 *    and `StandardHeader` of the Archived / Inspiration pages.
 * Presence dots are not drawn: `PresenceIndicator` is realtime presence,
 * deferred to G1 with the conversation lane (R5.3). Ports only; RTL-safe
 * (logical start/end); every string arrives translated.
 */
import { Component, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, PressableRow, Skeleton, Text, useUITheme } from '../../ports/ui';
import { InboxButtonIcon, InboxIcon } from '../../ports/inbox';
import { openWebPath } from '../../ports/links';
import { useInboxText } from './text';

export function ConversationCard({
  id,
  name,
  avatarUrl,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isPinned = false,
  onPress,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isPinned?: boolean;
  onPress: () => void;
}): ReactElement {
  const { colors } = useUITheme();
  const { t, cardTime } = useInboxText();
  const hasUnread = unreadCount > 0;
  return (
    <View
      testID={`inbox-card-${id}`}
      style={[styles.card, { backgroundColor: colors.card }, hasUnread ? { borderStartWidth: 2, borderStartColor: colors.primary } : null]}
    >
      <PressableRow accessibilityLabel={name} testID={`inbox-card-${id}-open`} onPress={onPress} style={styles.cardPress}>
        <View style={styles.avatarWrap}>
          <Avatar uri={avatarUrl ?? undefined} fallback={name?.[0]?.toUpperCase() || '?'} size={48} />
          {isPinned ? <View testID={`inbox-card-${id}-pinned`} style={[styles.pinned, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text size="sm" weight={hasUnread ? '600' : '500'} numberOfLines={1} style={styles.fill}>
              {name}
            </Text>
            <Text size="xs" muted>
              {cardTime(timestamp)}
            </Text>
          </View>
          {lastMessage ? (
            <Text size="sm" weight={hasUnread ? '500' : '400'} color={hasUnread ? colors.foreground : colors.mutedForeground} numberOfLines={1}>
              {lastMessage}
            </Text>
          ) : null}
        </View>
        {hasUnread ? (
          <View testID={`inbox-card-${id}-unread`} accessibilityLabel={t('inboxNative.unreadCount', { count: unreadCount })} style={[styles.unread, { backgroundColor: colors.primary }]}>
            <Text size="xs" weight="600" color={colors.primaryForeground} style={styles.unreadText}>
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </Text>
          </View>
        ) : null}
      </PressableRow>
    </View>
  );
}

export function ConversationSkeleton({ count = 5 }: { count?: number }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID="inbox-skeleton" style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, styles.skeletonRow, { backgroundColor: colors.card }]}>
          <Skeleton style={styles.skeletonAvatar} />
          <View style={[styles.cardBody, styles.skeletonBody]}>
            <View style={styles.cardTop}>
              <Skeleton style={styles.skeletonName} />
              <Skeleton style={styles.skeletonTime} />
            </View>
            <Skeleton style={styles.skeletonLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function InboxEmptyState({ context, onNewMessage }: { context: 'global' | 'tenant'; onNewMessage?: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  return (
    <View testID="inbox-empty" style={styles.empty}>
      <View style={styles.illustration}>
        <View style={[styles.illustrationCircle, { backgroundColor: colors.muted }]}>
          <InboxIcon name="MessageSquare" size={40} color={colors.primary} />
        </View>
        <View style={[styles.illustrationBadge, { backgroundColor: colors.accent }]}>
          <InboxIcon name="Users" size={16} color={colors.primaryForeground} />
        </View>
      </View>
      <Text size="lg" weight="600" style={styles.center}>
        {t('inbox.emptyState.title')}
      </Text>
      <Text size="sm" muted style={[styles.center, styles.emptyText]}>
        {context === 'global' ? t('inbox.emptyState.globalDescription') : t('inbox.emptyState.tenantDescription')}
      </Text>
      <View style={styles.emptyActions}>
        {onNewMessage ? (
          <Button testID="inbox-empty-start" onPress={onNewMessage}>
            <InboxButtonIcon name="MessageSquare" />
            {t('inbox.emptyState.startConversation')}
          </Button>
        ) : null}
        <Button testID="inbox-empty-discover" variant="outline" onPress={() => openWebPath('/community')}>
          <InboxButtonIcon name="Compass" />
          {t('inbox.emptyState.discoverPeople')}
        </Button>
      </View>
    </View>
  );
}

/** One row that throws renders the web's row fallback instead of taking the list down. */
export class RowErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function RowFallback(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useInboxText();
  return (
    <View testID="inbox-row-error" style={[styles.rowError, { borderColor: colors.border, backgroundColor: colors.muted }]}>
      <Text size="sm" muted>
        {t('screens.messages.conversationRowError')}
      </Text>
    </View>
  );
}

export type InboxSection = 'overview' | 'inspiration' | 'archived';

/** The web `messagesNavigation` (src/config/navigation.ts:44-48). */
export const INBOX_NAV: ReadonlyArray<{ id: InboxSection; path: string }> = [
  { id: 'overview', path: '/inbox' },
  { id: 'inspiration', path: '/inbox/inspiration' },
  { id: 'archived', path: '/inbox/archived' },
];

export function InboxSubNav({ active }: { active: InboxSection }): ReactElement {
  const { t } = useInboxText();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNav} testID="inbox-subnav">
      {INBOX_NAV.map((item) => {
        const on = item.id === active;
        return (
          <Button
            key={item.id}
            size="sm"
            variant={on ? 'secondary' : 'ghost'}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => (on ? undefined : openWebPath(item.path))}
            testID={`inbox-subnav-${item.id}`}
          >
            {t(`inboxNative.subnav.${item.id}`)}
          </Button>
        );
      })}
    </ScrollView>
  );
}

/** Sub-navigation, the StandardHeader twin (emoji + title + description), the utility row, the body. */
export function InboxPage({ active, title, description, emoji, actions, children, testID }: { active: InboxSection; title: string; description: string; emoji: string; actions?: ReactNode; children: ReactNode; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <InboxSubNav active={active} />
      <View style={styles.header}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {emoji}
        </Text>
        <View style={styles.fill}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <Text muted style={styles.description}>
            {description}
          </Text>
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  list: { gap: 8 },
  card: { borderRadius: 12, overflow: 'hidden' },
  cardPress: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64 },
  avatarWrap: { width: 48, height: 48 },
  pinned: { position: 'absolute', top: -4, end: -4, width: 12, height: 12, borderRadius: 6 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  unread: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 10 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24 },
  skeletonBody: { gap: 8 },
  skeletonName: { height: 16, width: 96 },
  skeletonTime: { height: 12, width: 40 },
  skeletonLine: { height: 14, width: '100%', maxWidth: 200 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  illustration: { marginBottom: 24 },
  illustrationCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  illustrationBadge: { position: 'absolute', top: -4, end: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 8, marginBottom: 24, maxWidth: 280 },
  emptyActions: { gap: 12, width: '100%', maxWidth: 240 },
  rowError: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  subNav: { gap: 4, paddingBottom: 4 },
  page: { padding: 16, paddingBottom: 120, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emoji: { fontSize: 28, lineHeight: 34 },
  description: { marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
