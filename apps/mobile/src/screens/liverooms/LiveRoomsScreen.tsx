/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — native port of the mobile web Live Rooms
 * list (`src/pages/community/LiveRooms.tsx`, the `useIsMobile()` branch). The all / live / scheduled /
 * past tabs follow the `tab` route param. Each tab shows its room cards (or the past rows), its own
 * loaded, empty and error states, and the drawer for a tapped room. Notify me writes the member's
 * subscription row. Not ported in this lane, listed in the PR body: Go Live, the autopilot popup, and
 * the host's edit and delete flows.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { CardSkeletons, EmptyBlock, ListError, ModeChips, type RoomsTab } from './components';
import { RoomCard, type RoomCardAction } from './RoomCard';
import { RoomDrawer } from './RoomDrawer';
import { formatClock, formatIntl, formatRoomDuration, formatScheduledWhen } from './format';
import {
  allRoomsInTimeOrder,
  filterRooms,
  streamToRoom,
  type LiveStreamRow,
  type RoomView,
} from './data/rules';
import {
  useEndedStreams,
  useLiveStreams,
  useMyRoomSubscriptions,
  useRoomProfiles,
  useRoomSubscribers,
  useRoomSubscriberCounts,
  useScheduledStreams,
  useToggleRoomNotify,
  type EndedRoomRow,
} from './data/rooms';

export type LiveRoomsTab = RoomsTab;

const roomPath = (id: string) => `/comm/live-rooms/${encodeURIComponent(id)}/view`;

export function LiveRoomsScreen({ initialTab = 'all' }: { initialTab?: LiveRoomsTab }) {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const [tab, setTab] = useState<LiveRoomsTab>(initialTab);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => setTab(initialTab), [initialTab]);

  const liveQuery = useLiveStreams();
  const scheduledQuery = useScheduledStreams();
  const endedQuery = useEndedStreams(tab === 'past');
  const liveStreams: LiveStreamRow[] = liveQuery.data ?? [];
  const scheduledStreams: LiveStreamRow[] = scheduledQuery.data ?? [];
  const endedStreams: EndedRoomRow[] = endedQuery.data ?? [];

  const profilesQuery = useRoomProfiles([...liveStreams, ...scheduledStreams, ...endedStreams].map((s) => s.created_by));
  const profiles = new Map((profilesQuery.data ?? []).map((p) => [p.user_id, p] as const));
  const counts = useRoomSubscriberCounts(scheduledStreams.map((s) => s.id)).data ?? {};
  const mine = useMyRoomSubscriptions(user?.id).data ?? new Set<string>();
  const toggleNotify = useToggleRoomNotify(user?.id);

  const hostOf = (createdBy: string) => {
    const profile = profiles.get(createdBy);
    return {
      name:
        profile?.display_name || (createdBy === user?.id ? t('screens.liverooms.you') : t('screens.liverooms.anonymousHost')),
      avatar: profile?.avatar_url ?? null,
    };
  };
  const liveRooms = liveStreams.map((s) => streamToRoom(s, hostOf(s.created_by), { interestedCount: counts[s.id] ?? 0 }));
  const scheduledRooms = scheduledStreams.map((s) => streamToRoom(s, hostOf(s.created_by), { interestedCount: counts[s.id] ?? 0 }));
  const filteredLive = filterRooms(liveRooms, search);
  const filteredScheduled = filterRooms(scheduledRooms, search);
  const allRooms = allRoomsInTimeOrder(filteredLive, filteredScheduled);

  const selectedRoom: RoomView | null = selectedId ? [...liveRooms, ...scheduledRooms].find((r) => r.id === selectedId) ?? null : null;
  const subscribersQuery = useRoomSubscribers(selectedRoom?.id ?? '', !!selectedRoom && !selectedRoom.isLive);

  const failed =
    tab === 'past' ? endedQuery.isError : tab === 'live' ? liveQuery.isError : tab === 'scheduled' ? scheduledQuery.isError : liveQuery.isError || scheduledQuery.isError;
  const retry = () => {
    void liveQuery.refetch();
    void scheduledQuery.refetch();
    void endedQuery.refetch();
  };

  const isLoading =
    tab === 'past' ? endedQuery.isLoading : tab === 'live' ? liveQuery.isLoading : tab === 'scheduled' ? scheduledQuery.isLoading : liveQuery.isLoading || scheduledQuery.isLoading;

  const notify = (room: RoomView) => {
    if (!user) return;
    toggleNotify.mutate({ streamId: room.id, on: mine.has(room.id) });
  };
  const openRoom = (roomId: string) => {
    setSelectedId(null);
    navigateToWebPath(roomPath(roomId));
  };

  const cardFor = (room: RoomView) => {
    const duration = formatRoomDuration(room.durationMinutes, t);
    const start = room.startedAt ?? room.scheduledTime;
    const whenLine = room.isLive
      ? [start ? t('screens.liverooms.timeChip', { time: formatClock(new Date(start)) }) : undefined, duration].filter(Boolean).join(' · ') || undefined
      : room.scheduledTime
        ? [formatScheduledWhen(room.scheduledTime, locale, t), duration].filter(Boolean).join(' · ')
        : undefined;
    const isCreator = room.host.id === user?.id;
    let action: RoomCardAction = { kind: 'none' };
    if (room.isLive) action = { kind: 'join', label: isCreator ? t('screens.liverooms.manage') : t('screens.liverooms.join') };
    else if (room.startingSoon && isCreator) action = { kind: 'join', label: t('screens.liveRoom.startNow') };
    else if (room.scheduledTime) {
      const on = mine.has(room.id);
      action = { kind: 'notify', label: on ? t('screens.liverooms.notifying') : t('screens.liverooms.notifyMe'), on };
    }
    return (
      <RoomCard
        key={room.id}
        room={room}
        pillar={room.isLive ? t('screens.liverooms.live') : undefined}
        whenLine={whenLine}
        countLine={room.isLive ? t('spotlightSocial.liveRooms.listening', { count: room.participants }) : t('screens.liverooms.willJoinCount', { count: room.interestedCount })}
        action={action}
        onOpen={() => setSelectedId(room.id)}
        onJoin={() => openRoom(room.id)}
        onNotify={() => notify(room)}
      />
    );
  };

  const emptyCopy = (): { body: string; hint?: string; testID: string } => {
    if (tab === 'scheduled') return { body: t('screens.community.noScheduledRooms'), testID: 'live-rooms-empty-scheduled' };
    if (tab === 'past') return { body: t('screens.liverooms.past.empty'), hint: t('screens.liverooms.past.emptyHint'), testID: 'live-rooms-empty-past' };
    return { body: t('liveRooms.noRooms'), testID: `live-rooms-empty-${tab}` };
  };

  let content: ReactNode;
  if (failed) {
    content = (
      <ListError message={t('errors.somethingWentWrong')} retryLabel={t('common.retry')} onRetry={retry} testID="live-rooms-error" />
    );
  } else if (isLoading) {
    content = <CardSkeletons count={3} testID="live-rooms-loading" />;
  } else if (tab === 'past') {
    content = endedStreams.length === 0 ? (
      <EmptyBlock {...emptyCopy()} />
    ) : (
      <View style={styles.list} testID="live-rooms-list">
        {endedStreams.map((stream) => {
          const hostName = hostOf(stream.created_by).name;
          const endedAt = stream.ended_at ?? stream.created_at;
          return (
            <View key={stream.id} style={[styles.pastRow, { borderColor: colors.border, backgroundColor: colors.card }]} testID={`past-room-${stream.id}`}>
              <Text weight="700" numberOfLines={2}>
                {stream.title}
              </Text>
              <Text variant="caption" muted>
                {hostName}
              </Text>
              <Text variant="caption" muted>
                {formatIntl(new Date(endedAt), locale, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {stream.recording ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => void Linking.openURL(stream.recording!.recording_url)}
                  testID={`past-replay-${stream.id}`}
                  style={styles.rowAction}
                >
                  {t('screens.community.streamReplay')}
                </Button>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  } else {
    const rooms = tab === 'live' ? filteredLive : tab === 'scheduled' ? filteredScheduled : allRooms;
    content =
      rooms.length === 0 ? (
        <EmptyBlock {...emptyCopy()} />
      ) : (
        <View style={styles.list} testID="live-rooms-list">
          {rooms.map((room) => cardFor(room))}
        </View>
      );
  }

  return (
    <>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID="live-rooms-screen">
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('liveRooms.title')}
          </Text>
          <Text muted>{t('liveRooms.description')}</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('screens.community.searchLiveRooms')}
          accessibilityLabel={t('screens.community.searchLiveRooms')}
          testID="live-rooms-search"
          style={[styles.search, { borderColor: colors.border, color: colors.foreground }]}
        />

        <ModeChips
          groupLabel={t('spotlightSocial.liveRooms.tabsLabel')}
          selected={tab}
          onSelect={setTab}
          testID="live-rooms-tabs"
          chips={[
            { key: 'all', label: t('liveRooms.tabs.all'), count: allRooms.length || undefined },
            { key: 'live', label: t('liveRooms.tabs.live'), count: filteredLive.length || undefined },
            { key: 'scheduled', label: t('liveRooms.tabs.scheduled'), count: filteredScheduled.length || undefined },
            { key: 'past', label: t('liveRooms.tabs.past') },
          ]}
        />

        {content}
      </ScrollView>

      {selectedRoom ? (
        <RoomDrawer
          room={selectedRoom}
          open
          onClose={() => setSelectedId(null)}
          isCreator={selectedRoom.host.id === user?.id}
          notifying={mine.has(selectedRoom.id)}
          subscriberCount={counts[selectedRoom.id] ?? 0}
          subscribers={subscribersQuery.data ?? []}
          locale={locale}
          t={t}
          onJoin={() => openRoom(selectedRoom.id)}
          onToggleNotify={() => notify(selectedRoom)}
          onOpenHost={() => navigateToWebPath(`/u/${encodeURIComponent(selectedRoom.host.id)}`)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  list: { gap: 16 },
  pastRow: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  rowAction: { marginTop: 6, alignSelf: 'flex-start' },
});
