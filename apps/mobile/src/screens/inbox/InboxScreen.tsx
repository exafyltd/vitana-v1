/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the native inbox
 * list (`/inbox`, INBOX.OVERVIEW), a 1:1 port of the mobile-web branch of
 * `src/pages/Messages.tsx` (`useIsMobile()`, lines 1272-1435: list-first, a
 * tap opens the conversation full screen):
 *  - StandardHeader: `inbox.title` + `inbox.description`;
 *  - the action row: Search (filters the list by title / last message, with
 *    the matching-conversation dropdown), the Community / Network mode pill,
 *    the "New" button (the new-conversation sheet);
 *  - the All / Direct / Groups pills and the overflow menu with
 *    "Mark all as read" (disabled at 0 unread);
 *  - the list: skeleton while the first fetch runs, the empty state, the
 *    "no conversations matching" state, else the sorted + per-peer-deduped
 *    conversation cards, rendered progressively (useProgressiveCount).
 * A row opens the conversation-chat lane's route by path (`src/ports/links`).
 *
 * Documented deferrals (file:line evidence in docs/validation/VTID-05459/verification.md):
 * the action-rail chips (gift voucher, VitanaIndexChip, AutopilotChip +
 * AutopilotPopup) and UniversalCalendarButton belong to other lanes' surfaces
 * (as in the home and diary lanes); the in-message search panel
 * (MessageSearchPanel, VTID-05317) and the Contacts pill (ContactsTabContent)
 * are separate features with their own data layers; CallManager rides with the
 * conversation-chat lane. React 19: typed with `ReactElement`.
 */
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, PressableRow, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { InboxButtonIcon, InboxIcon, Input } from '../../ports/inbox';
import { openWebPath } from '../../ports/links';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { ConversationCard, ConversationSkeleton, InboxEmptyState, RowErrorBoundary, RowFallback } from './components';
import { NewConversationSheet } from './NewConversationSheet';
import { useInboxText } from './text';
import { useInboxThreads, useProgressiveCount, useUnreadSync } from './data/inbox';
import { refreshInboxUnread } from './data/unread';
import {
  conversationPathFor,
  filterThreads,
  getConversationDisplayAvatar,
  getConversationDisplayTitle,
  searchThreads,
  sortAndDedupe,
  type ConversationFilter,
  type InboxContext,
  type InboxThread,
} from './data/threads-model';

const FILTERS: readonly ConversationFilter[] = ['all', 'direct', 'groups'];
const NO_PINS: ReadonlySet<string> = new Set();

/** The member's last explicit Community / Network choice for this app session (web sessionStorage). */
let lastContext: InboxContext = 'global';

/** Test seam: a fresh app session (Community). */
export function __resetInboxContextForTests(): void {
  lastContext = 'global';
}

export function InboxScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, fallbacks } = useInboxText();
  const [context, setContextState] = useState<InboxContext>(lastContext);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const { threads, userId, isLoading, isFetching, refetch, markAllRead } = useInboxThreads(context, t('inboxNative.vitanaWelcome'));

  const setContext = (next: InboxContext) => {
    lastContext = next;
    setContextState(next);
    setOptimistic({});
    setSearch('');
    setSearchOpen(false);
  };

  // Optimistic read state; the server wins when it reports a new unread message.
  const display = useMemo(
    () =>
      threads.map((th) => {
        const o = optimistic[th.id];
        const real = th.unread_count;
        return { ...th, unread_count: o === 0 && real > 0 ? real : (o ?? real) };
      }),
    [threads, optimistic],
  );

  useUnreadSync(
    useCallback(
      (threadId, ctx) => {
        if (ctx === context) setOptimistic((p) => ({ ...p, [threadId]: 0 }));
      },
      [context],
    ),
    useCallback(
      (threadId, ctx) => {
        if (ctx !== context) return;
        setOptimistic((p) => {
          const next = { ...p };
          delete next[threadId];
          return next;
        });
      },
      [context],
    ),
  );

  const title = useCallback((th: InboxThread) => getConversationDisplayTitle(th, userId, fallbacks), [userId, fallbacks]);
  const totalUnread = display.reduce((sum, th) => sum + (th.unread_count || 0), 0);

  const visible = useMemo(() => sortAndDedupe(searchThreads(filterThreads(display, filter), search, title), NO_PINS, userId), [display, filter, search, title, userId]);
  const limit = useProgressiveCount(visible.length, { initial: 24, resetKey: context });
  const rows = search.trim() ? visible : visible.slice(0, limit);

  const dropdown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return display
      .filter((th) => title(th).toLowerCase().includes(q) || (th.last_message?.body || '').toLowerCase().includes(q))
      .slice(0, 6)
      .map((th) => {
        const body = th.last_message?.body;
        return { thread: th, title: title(th), subtitle: body ? (body.length > 60 ? `${body.slice(0, 60)}…` : body) : undefined };
      });
  }, [display, search, title]);

  const open = (th: InboxThread) => {
    if ((th.unread_count || 0) > 0) setOptimistic((p) => ({ ...p, [th.id]: 0 }));
    openWebPath(conversationPathFor(th, context, userId));
  };

  const onMarkAllRead = async () => {
    setMenuOpen(false);
    if (totalUnread === 0) return;
    try {
      await markAllRead(filter);
      refreshInboxUnread();
      notify('inbox.toast.allMarkedRead');
    } catch {
      notifyError('inbox.toast.markAllReadFailed');
    }
  };

  const modes: ModeOption[] = [
    { value: 'global', label: t('inbox.contextTabs.community'), icon: '🌐' },
    { value: 'tenant', label: t('inbox.contextTabs.network'), icon: '🏢' },
  ];

  const showSkeleton = (isLoading || isFetching) && threads.length === 0;

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('inbox.title')}
        </Text>
        <Text muted>{t('inbox.description')}</Text>
      </View>

      {showSkeleton ? null : (
        <>
          <View style={styles.bar}>
            {searchOpen ? (
              <View style={[styles.searchBox, { borderColor: colors.input }]}>
                <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
                <Input testID="inbox-search-input" autoFocus value={search} onChangeText={setSearch} placeholder={t('inbox.searchPlaceholder')} style={styles.searchInput} />
                <Button
                  size="xs"
                  variant="ghost"
                  testID="inbox-search-close"
                  accessibilityLabel={t('inboxNative.searchClose')}
                  onPress={() => {
                    setSearch('');
                    setSearchOpen(false);
                  }}
                >
                  <InboxIcon name="X" size={12} />
                </Button>
              </View>
            ) : (
              <PressableRow testID="inbox-search" onPress={() => setSearchOpen(true)} style={[styles.searchPill, { backgroundColor: colors.muted }]}>
                <InboxIcon name="Search" size={16} color={colors.mutedForeground} />
                <Text size="sm">{t('actionBar.search')}</Text>
              </PressableRow>
            )}
            {searchOpen ? null : (
              <>
                <MobileModePill modes={modes} activeMode={context} title={t('inboxNative.selectContext')} onModeChange={(v) => setContext(v === 'tenant' ? 'tenant' : 'global')} />
                <Button size="sm" testID="inbox-new" onPress={() => setNewOpen(true)} style={styles.newButton}>
                  <InboxButtonIcon name="Plus" />
                  {t('inbox.actions.new')}
                </Button>
              </>
            )}
          </View>

          {searchOpen && dropdown.length > 0 ? (
            <View testID="inbox-search-dropdown" style={[styles.dropdown, { backgroundColor: colors.popover, borderColor: colors.border }]}>
              {dropdown.map((d) => (
                <PressableRow
                  key={d.thread.id}
                  testID={`inbox-search-item-${d.thread.id}`}
                  onPress={() => {
                    setSearch('');
                    setSearchOpen(false);
                    open(d.thread);
                  }}
                  style={styles.dropdownItem}
                >
                  <View style={styles.fill}>
                    <Text size="sm" weight="500" numberOfLines={1}>
                      {d.title}
                    </Text>
                    {d.subtitle ? (
                      <Text size="xs" muted numberOfLines={1}>
                        {d.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </PressableRow>
              ))}
            </View>
          ) : null}

          <View style={styles.filterRow}>
            <View style={styles.pills}>
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  testID={`inbox-filter-${f}`}
                  variant={filter === f ? 'default' : 'secondary'}
                  accessibilityState={{ selected: filter === f }}
                  onPress={() => setFilter(f)}
                  style={styles.pill}
                >
                  {t(`inbox.tabs.${f}`)}
                </Button>
              ))}
            </View>
            <Button size="icon" variant="ghost" testID="inbox-menu" accessibilityLabel={t('inbox.actions.menu')} onPress={() => setMenuOpen(true)}>
              <InboxIcon name="MoreVertical" size={16} />
            </Button>
          </View>
        </>
      )}
    </View>
  );

  const empty = search.trim() ? (
    <View testID="inbox-no-match" style={styles.noMatch}>
      <InboxIcon name="Search" size={40} color={colors.mutedForeground} />
      <Text muted style={styles.center}>
        {t('screens.messages.noConversationsMatchingInboxsearchquery', { inboxSearchQuery: search })}
      </Text>
    </View>
  ) : (
    <InboxEmptyState context={context} onNewMessage={() => setNewOpen(true)} />
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {showSkeleton ? (
        <View testID="screen-inbox" style={styles.page}>
          {header}
          <View accessibilityState={{ busy: true }} accessibilityLabel={t('loading.default')}>
            <ConversationSkeleton count={6} />
          </View>
        </View>
      ) : (
        <FlatList
          testID="screen-inbox"
          data={rows}
          keyExtractor={(th) => th.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.page}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          refreshing={false}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <RowErrorBoundary fallback={<RowFallback />}>
              <ConversationCard
                id={item.id}
                name={title(item) || fallbacks.unknown}
                avatarUrl={getConversationDisplayAvatar(item, userId)}
                lastMessage={item.last_message?.body}
                timestamp={item.updated_at}
                unreadCount={item.unread_count || 0}
                onPress={() => open(item)}
              />
            </RowErrorBoundary>
          )}
        />
      )}

      <BottomSheet testID="inbox-menu-sheet" open={menuOpen} onClose={() => setMenuOpen(false)} title={t('inbox.actions.menu')}>
        <PressableRow testID="inbox-mark-all-read" disabled={totalUnread === 0} accessibilityState={{ disabled: totalUnread === 0 }} onPress={() => void onMarkAllRead()} style={[styles.menuRow, totalUnread === 0 ? styles.disabled : null]}>
          <InboxIcon name="CheckCheck" size={16} />
          <Text>{t('inbox.actions.markAllRead')}</Text>
        </PressableRow>
      </BottomSheet>

      <NewConversationSheet open={newOpen} onClose={() => setNewOpen(false)} context={context} onGroupCreated={refetch} />
    </View>
  );
}

function Separator(): ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 128 },
  headerBlock: { gap: 12, marginBottom: 12 },
  header: { gap: 4 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: 18 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0 },
  newButton: { borderRadius: 18, gap: 6 },
  dropdown: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pills: { flexDirection: 'row', gap: 8, flexShrink: 1 },
  pill: { borderRadius: 16 },
  noMatch: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  separator: { height: 8 },
  menuRow: { paddingVertical: 12, paddingHorizontal: 4 },
  disabled: { opacity: 0.5 },
});
