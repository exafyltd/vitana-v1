/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — `/comm/events-meetups`
 * (COMM.EVENTS with `?tab=hot|today|upcoming|following`, COMM.OVERVIEW and COMM.FEED
 * resolve here too): the native twin of the mobile-web branch of
 * `src/pages/community/EventsAndMeetups.tsx`. The tab comes from the `tab` search
 * param and the filter sheet; the list is a FlatList of event cards with
 * pull-to-refresh and incremental loading; a card opens the event and meetup drawer;
 * the `event` search param opens a linked event. Live-room cards (live-rooms lane)
 * and ticket checkout (purchase surface, not in this port) are not rendered here.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BottomSheet, Button, Spinner, Text, TextInput, notifyError, selectHotEvents, useUITheme } from '../../ports/events';
import { useAuth } from '../../auth/AuthProvider';
import { canDeleteEvent, canEditEvent, fetchEventByIdOrSlug, type CommunityEvent } from './data/events';
import { useCommunityEvents, useEventMutations, useFollowingFeed } from './data/hooks';
import { useEventsText } from './text';
import { EventCard } from './EventCard';
import { EventDrawer } from './EventDrawer';
import { CreateSelectionSheet } from './CreateSelectionSheet';
import { EventFormSheet } from './EventFormSheet';

export const TABS = ['hot', 'today', 'upcoming', 'following'] as const;
export type EventsTab = (typeof TABS)[number];
const PAGE_SIZE = 20;
const DAY_MS = 86_400_000;

const TAB_LABEL_KEY: Record<EventsTab, string> = {
  hot: 'spotlightSocial.events.tabs.hot',
  today: 'events.tabs.today',
  upcoming: 'events.tabs.upcoming',
  following: 'events.tabs.following',
};
const TAB_ICON: Record<EventsTab, string> = { hot: '🔥', today: '☀', upcoming: '📅', following: '👥' };

export const isEventsTab = (value: unknown): value is EventsTab => (TABS as readonly string[]).includes(value as string);

const startOfDay = (d: Date): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const byStart = (a: CommunityEvent, b: CommunityEvent) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

/** The events a tab lists (web: today, upcoming, hot, following). */
export function selectTabEvents(tab: EventsTab, events: CommunityEvent[], followingIds: string[], now: Date): CommunityEvent[] {
  const today = startOfDay(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = startOfDay(tomorrowDate);
  if (tab === 'today') {
    return events.filter((e) => {
      const s = new Date(e.start_time).getTime();
      return s >= today && s < tomorrow;
    }).sort(byStart);
  }
  if (tab === 'upcoming') return events.filter((e) => new Date(e.start_time).getTime() >= tomorrow).sort(byStart);
  if (tab === 'following') {
    const followed = new Set(followingIds);
    return events.filter((e) => followed.has(e.created_by) && new Date(e.start_time).getTime() >= today).sort(byStart);
  }
  return selectHotEvents(events, now);
}

type FormState = { mode: 'create' | 'edit'; kind: 'event' | 'meetup'; event?: CommunityEvent };

export function EventsMeetupsScreen() {
  const params = useLocalSearchParams<{ tab?: string; event?: string }>();
  const text = useEventsText();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const feed = useCommunityEvents();
  const following = useFollowingFeed();
  const mutations = useEventMutations();

  const [tab, setTab] = useState<EventsTab>(isEventsTab(params.tab) ? params.tab : 'hot');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [selected, setSelected] = useState<CommunityEvent | null>(null);

  useEffect(() => {
    if (isEventsTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [tab, query]);

  // A linked event (`?event=<id|slug>`) opens its drawer; one outside the loaded list is read on its own.
  const linkRef = params.event;
  const inList = linkRef ? feed.events.find((e) => e.id === linkRef || e.slug === linkRef) : undefined;
  const linked = useQuery({
    queryKey: ['linked-event', linkRef, userId],
    queryFn: () => fetchEventByIdOrSlug(linkRef as string, userId),
    enabled: !!linkRef && !inList,
  });
  useEffect(() => {
    const found = inList ?? linked.data;
    if (linkRef && found) setSelected(found);
  }, [linkRef, inList, linked.data]);

  const list = useMemo(() => {
    const base = selectTabEvents(tab, feed.events, following.followingIds, new Date());
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((e) => e.title.toLowerCase().includes(q) || (e.location ?? '').toLowerCase().includes(q));
  }, [tab, feed.events, following.followingIds, query]);

  const shown = list.slice(0, visible);

  const openCreate = (kind: 'event' | 'meetup') => {
    setCreateOpen(false);
    setForm({ mode: 'create', kind });
  };

  const confirmDelete = (event: CommunityEvent) => {
    Alert.alert(event.title, undefined, [
      { text: text.t('buttons.cancel'), style: 'cancel' },
      {
        text: text.t('buttons.delete'),
        style: 'destructive',
        onPress: () =>
          mutations.remove.mutate(event.id, {
            onSuccess: () => setSelected(null),
            onError: () => notifyError('toasts.hooks.error', 'toasts.hooks.failedUpdate'),
          }),
      },
    ]);
  };

  const emptyView = (() => {
    if (feed.loading) {
      return (
        <View testID="events-loading" style={styles.center}>
          <Spinner accessibilityLabel={text.t('buttons.retry')} />
        </View>
      );
    }
    if (feed.isError) {
      return (
        <View testID="events-error" style={styles.center}>
          <Text variant="body">{text.t('errors.tryAgain')}</Text>
          <Button testID="events-retry" variant="outline" onPress={() => void feed.refetch()}>
            {text.t('buttons.retry')}
          </Button>
        </View>
      );
    }
    const copy = (() => {
      if (tab === 'today') return ['events.emptyStates.noEventsToday', 'events.emptyStates.noEventsTodayDesc'];
      if (tab === 'upcoming') return ['screens.community.noUpcomingEvents', 'screens.community.thereNoEventsScheduledFirstCreate'];
      if (tab === 'following') {
        return following.followingIds.length === 0
          ? ['events.emptyStates.followingTitle', 'events.emptyStates.followingDesc']
          : ['events.emptyStates.noPostsFromFollowing', 'events.emptyStates.noPostsFromFollowingDesc'];
      }
      return ['screens.community.noRecommendedEvents', 'screens.community.checkBackSoonForCuratedEvents'];
    })();
    return (
      <View testID="events-empty" style={styles.center}>
        <Text variant="title">{text.t(copy[0])}</Text>
        <Text variant="body">{text.t(copy[1])}</Text>
        {tab === 'following' && following.followingIds.length === 0 ? (
          <Button variant="outline" onPress={() => router.push('/comm/members' as never)}>
            {text.t('events.emptyStates.findPeople')}
          </Button>
        ) : (
          <Button variant="outline" onPress={() => openCreate('meetup')}>
            {text.t('events.emptyStates.createEvent')}
          </Button>
        )}
      </View>
    );
  })();

  const header = (
    <View style={styles.header}>
      <Text variant="title">{text.t('events.title')}</Text>
      <Text variant="body" color={colors.mutedForeground}>
        {text.t('events.description')}
      </Text>
      <View style={styles.row}>
        <Button testID="events-filter" variant="outline" size="sm" onPress={() => setFilterOpen(true)}>
          {`${TAB_ICON[tab]} ${text.t(TAB_LABEL_KEY[tab])}`}
        </Button>
        <Button testID="events-create" size="sm" onPress={() => setCreateOpen(true)}>
          {text.t('buttons.create')}
        </Button>
      </View>
      <TextInput
        testID="events-search"
        value={query}
        onChangeText={setQuery}
        placeholder={text.t('events.searchPlaceholder')}
        accessibilityLabel={text.t('events.searchPlaceholder')}
      />
    </View>
  );

  return (
    <View testID="events-hub" style={styles.root}>
      <FlatList
        testID="events-list"
        data={shown}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} onPress={() => setSelected(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={feed.isFetching} onRefresh={() => void feed.refetch()} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => setVisible((v) => Math.min(v + PAGE_SIZE, list.length))}
      />

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={text.t('eventsNative.filterTitle')} testID="events-filter-sheet">
        <View style={styles.sheet}>
          {TABS.map((value) => (
            <Pressable
              key={value}
              testID={`events-tab-${value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === value }}
              onPress={() => {
                setTab(value);
                setFilterOpen(false);
              }}
              style={[styles.tabRow, tab === value ? { backgroundColor: colors.primary } : null]}
            >
              <Text variant="body" color={tab === value ? colors.primaryForeground : colors.foreground}>
                {`${TAB_ICON[value]} ${text.t(TAB_LABEL_KEY[value])}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <CreateSelectionSheet open={createOpen} onClose={() => setCreateOpen(false)} onPick={openCreate} />

      {form ? (
        <EventFormSheet
          mode={form.mode}
          kind={form.kind}
          event={form.event}
          open
          onClose={() => setForm(null)}
        />
      ) : null}

      <EventDrawer
        event={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        canEdit={!!selected && canEditEvent(selected, userId, !!selected.is_co_creator, new Date())}
        canDelete={!!selected && canDeleteEvent(selected, userId)}
        onEdit={(event) => {
          setSelected(null);
          setForm({ mode: 'edit', kind: event.event_type === 'meetup' ? 'meetup' : 'event', event });
        }}
        onDelete={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  header: { gap: 10, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  center: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  sheet: { gap: 8, paddingBottom: 16 },
  tabRow: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
});
