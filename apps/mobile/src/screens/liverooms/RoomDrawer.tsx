/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — native twin of the mobile web
 * `LiveRoomDrawer` (`src/components/liverooms/LiveRoomDrawer.tsx`, the phone branch). A bottom sheet
 * with the room's title and host, the people count with the first faces of the people who tapped
 * "Notify me", the when (with the local / UTC toggle and a countdown under two hours), the
 * description, the room rules, and one action bar that matches the room's state and the viewer's role.
 * Not ported here, and listed in the PR body: the calendar export menu, the save bookmark, the share
 * control, the host's edit and delete actions, and the interested-people list sheet.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Badge, Button, Text, useUITheme } from '../../ports/ui';
import { formatCountdown, formatIntl, type Translate } from './format';
import type { RoomView } from './data/rules';
import type { StreamSubscriber } from './data/rooms';

export function RoomDrawer({
  room,
  open,
  onClose,
  isCreator,
  notifying,
  subscriberCount,
  subscribers,
  locale,
  t,
  onJoin,
  onToggleNotify,
  onOpenHost,
}: {
  room: RoomView;
  open: boolean;
  onClose: () => void;
  isCreator: boolean;
  notifying: boolean;
  subscriberCount: number;
  subscribers: StreamSubscriber[];
  locale: string;
  t: Translate;
  onJoin: () => void;
  onToggleNotify: () => void;
  onOpenHost: () => void;
}) {
  const { colors } = useUITheme();
  const [utc, setUtc] = useState(false);
  const isScheduled = !room.isLive && !!room.scheduledTime;
  const sched = room.scheduledTime ? new Date(room.scheduledTime) : null;
  const minutesUntil = sched ? Math.round((sched.getTime() - Date.now()) / 60_000) : 0;
  const showCountdown = isScheduled && minutesUntil > 0 && minutesUntil < 120;
  const audience = isScheduled ? subscriberCount : room.participants;
  const timeZone = utc ? 'UTC' : undefined;

  return (
    <BottomSheet open={open} onClose={onClose} testID="room-drawer">
      <View style={styles.stack}>
        <Text variant="title" accessibilityRole="header" testID="room-drawer-title" numberOfLines={3}>
          {room.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.liverooms.openHostProfile', { name: room.host.name })}
          onPress={onOpenHost}
          testID="room-drawer-host"
          style={styles.hostRow}
        >
          <Avatar uri={room.host.avatar} fallback={(room.host.name[0] ?? '?').toUpperCase()} size={28} />
          <Text weight="600" numberOfLines={1} style={styles.fill}>
            {room.host.name}
          </Text>
          <Badge variant="secondary">{isCreator ? t('screens.liverooms.yourRoom') : t('screens.liverooms.host')}</Badge>
        </Pressable>

        {room.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {room.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text weight="600">{t('screens.liverooms.peopleListening')}</Text>
          <View style={styles.faceRow}>
            {isScheduled
              ? subscribers.slice(0, 5).map((p) => (
                  <Avatar key={p.user_id} uri={p.avatar_url} fallback={(p.display_name ?? '?')[0]?.toUpperCase() ?? '?'} size={24} />
                ))
              : null}
            <Text muted testID="room-drawer-count">
              {t('screens.liverooms.willJoinCount', { count: audience })}
            </Text>
          </View>
        </View>

        {room.isLive ? (
          <View style={styles.section}>
            <Text weight="600">{t('screens.liverooms.when')}</Text>
            <Badge variant="destructive">{t('screens.liverooms.liveNow')}</Badge>
          </View>
        ) : null}

        {isScheduled && sched ? (
          <View style={styles.section}>
            <View style={styles.whenHeader}>
              <Text weight="600">{t('screens.liverooms.when')}</Text>
              <Pressable accessibilityRole="button" onPress={() => setUtc((v) => !v)} testID="room-drawer-tz" style={styles.tzToggle}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  {utc ? t('screens.liverooms.showLocal') : t('screens.liverooms.showUtc')}
                </Text>
              </Pressable>
            </View>
            <Text>
              {utc
                ? t('screens.liverooms.scheduledAtUtc', {
                    date: formatIntl(sched, locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone }),
                    time: formatIntl(sched, locale, { hour: '2-digit', minute: '2-digit', timeZone }),
                  })
                : t('screens.liverooms.scheduledAt', {
                    date: formatIntl(sched, locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone }),
                    time: formatIntl(sched, locale, { hour: '2-digit', minute: '2-digit', timeZone }),
                  })}
            </Text>
            {showCountdown ? (
              <Text variant="caption" muted>
                {t('screens.liverooms.startsValue0', { value0: formatCountdown(sched, locale) })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {room.description ? (
          <View style={styles.section}>
            <Text weight="600">{t('screens.liverooms.aboutThisRoom')}</Text>
            <Text muted>{room.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text weight="600">{t('screens.liverooms.roomRules')}</Text>
          <Text muted>{t('screens.liverooms.respectfulAllParticipants')}</Text>
          <Text muted>{t('screens.liverooms.raiseYourHandSpeak')}</Text>
          <Text muted>{t('screens.liverooms.muteWhenNotSpeaking')}</Text>
        </View>

        <View style={styles.actions}>
          {room.isLive ? (
            <Button onPress={onJoin} testID="room-drawer-join">
              {isCreator ? t('screens.liverooms.manage') : t('screens.liverooms.joinRoom')}
            </Button>
          ) : isScheduled && isCreator ? (
            <Button onPress={onJoin} testID="room-drawer-join">
              {t('screens.liverooms.goLiveNow')}
            </Button>
          ) : isScheduled ? (
            <Button variant={notifying ? 'secondary' : 'outline'} onPress={onToggleNotify} testID="room-drawer-notify">
              {notifying ? t('screens.liverooms.notifying') : t('screens.liverooms.notifyMe')}
            </Button>
          ) : null}
          <Button variant="ghost" onPress={onClose} testID="room-drawer-close">
            {t('common.close')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16, paddingBottom: 8 },
  fill: { flex: 1 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 6 },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tzToggle: { paddingVertical: 4, paddingHorizontal: 4 },
  actions: { gap: 8, marginTop: 4 },
});
