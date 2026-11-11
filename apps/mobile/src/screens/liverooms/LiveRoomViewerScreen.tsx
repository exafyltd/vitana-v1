/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — native port of the web live-room viewer
 * (`src/pages/community/LiveRoomViewer.tsx`, the phone branch). Host detection comes from
 * `live_rooms.host_user_id`; room state comes from the gateway and is polled while the room is live.
 * Enter asks the gateway for the room's private URL and meeting token, and the video surface comes
 * from the video port. Leaving records the exit and never ends the room. The host alone can end it,
 * after confirmation.
 *
 * Device join: this build registers no video engine (see `ports/live-room-video`). Without one the
 * entry action is disabled and `enter` is never called, so no attendance is recorded for a join that
 * cannot happen. The Daily.co join itself is a G1 owner step.
 */
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { getLiveRoomVideoEngine } from '../../ports/live-room-video';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import {
  LiveRoomEnterError,
  endRoom,
  enterRoom,
  exitRoom,
  hostAbsent,
  hostPresent,
  type EnterRoomErrorCode,
  type EnterRoomResponse,
} from './data/gateway';
import { useReadyRecording, useRoomHostId, useRoomState } from './data/rooms';

const LIST_PATH = '/comm/live-rooms';

export function LiveRoomViewerScreen({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const engine = getLiveRoomVideoEngine();
  const Surface = engine?.Surface;

  const hostQuery = useRoomHostId(roomId, !!user?.id);
  const stateQuery = useRoomState(roomId);
  const roomStatus = stateQuery.data?.room.status;
  const sessionTitle = stateQuery.data?.session?.session_title ?? null;
  const inRoomCount = stateQuery.data?.counts.in_room;
  const hasEnded = roomStatus === 'ended' || roomStatus === 'idle';
  const isLive = roomStatus === 'live' || roomStatus === 'lobby';
  const isHost = !!user?.id && hostQuery.data === user.id;
  const isHostResolving = !user || hostQuery.isLoading;
  const recordingQuery = useReadyRecording(roomId, hasEnded);

  const [entry, setEntry] = useState<EnterRoomResponse | null>(null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<EnterRoomErrorCode | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [endFailed, setEndFailed] = useState(false);
  const [surfaceFailed, setSurfaceFailed] = useState(false);
  const exitSent = useRef(false);

  // Once the viewer has entered, the host verdict from `enter` wins over the database read.
  const roomMode = !!entry || entering || !!enterError;
  const isRoomHost = entry ? entry.is_host : isHost;

  const sendExit = () => {
    if (exitSent.current) return;
    exitSent.current = true;
    void exitRoom(roomId).catch(() => undefined);
  };

  // Record the exit when the viewer unmounts after an entry, and when the room ends while the member is inside.
  useEffect(() => {
    if (!entry) return undefined;
    return () => sendExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, roomId]);
  useEffect(() => {
    if (hasEnded && entry) sendExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnded, entry, roomId]);

  const leave = () => {
    if (entry) sendExit();
    navigateToWebPath(LIST_PATH);
  };

  const handleEnter = async () => {
    if (!engine || !roomId) return;
    setEntering(true);
    setEnterError(null);
    try {
      const res = await enterRoom(roomId);
      exitSent.current = false;
      setEntry(res);
    } catch (err) {
      setEnterError(err instanceof LiveRoomEnterError ? err.code : 'UNKNOWN');
    } finally {
      setEntering(false);
    }
  };

  const endForEveryone = async () => {
    setEndOpen(false);
    setEndFailed(false);
    try {
      await endRoom(roomId);
      sendExit();
      navigateToWebPath(LIST_PATH);
    } catch {
      setEndFailed(true);
    }
  };

  const errorCopy = (code: EnterRoomErrorCode): { title: string; desc: string } => {
    switch (code) {
      case 'NOT_LIVE':
        return { title: t('screens.liveRoom.notLiveTitle'), desc: t('screens.liveRoom.notLiveDesc') };
      case 'PAYMENT_REQUIRED':
        return { title: t('screens.liveRoom.paymentRequiredTitle'), desc: t('screens.liveRoom.paymentRequiredDesc') };
      case 'UNAUTHENTICATED':
        return { title: t('screens.liveRoom.signInTitle'), desc: t('screens.liveRoom.signInDesc') };
      case 'NOT_FOUND':
        return { title: t('screens.community.roomNotFound'), desc: t('screens.liveRoom.notFoundDesc') };
      default:
        return { title: t('screens.community.videoRoomUnavailable'), desc: t('screens.community.videoRoomUnavailableHint') };
    }
  };

  if (!roomId) {
    return (
      <View style={styles.centered} testID="live-room-missing">
        <Text weight="600">{t('screens.community.roomNotFound')}</Text>
        <Button variant="outline" onPress={() => navigateToWebPath(LIST_PATH)}>
          {t('screens.community.backLiveRooms')}
        </Button>
      </View>
    );
  }

  if (hasEnded) {
    const streamTitle = sessionTitle ?? t('screens.liveRoom.defaultTitle');
    return (
      <View style={styles.centered} testID="live-room-ended">
        <Text variant="title" accessibilityRole="header">
          {t('screens.community.thisRoomHasEnded')}
        </Text>
        <Text muted>{t('screens.community.sessionStreamtitleHasConcluded', { streamTitle })}</Text>
        {recordingQuery.data ? (
          <Button onPress={() => void Linking.openURL(recordingQuery.data!.recording_url)} testID="live-room-replay">
            {t('screens.community.streamReplay')}
          </Button>
        ) : null}
        <Button variant="outline" onPress={() => navigateToWebPath(LIST_PATH)} testID="live-room-back">
          {t('screens.community.backRooms')}
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="live-room-viewer">
      <View style={[styles.header, { borderBottomColor: colors.border }]} testID="live-room-header">
        <Button
          variant="ghost"
          onPress={leave}
          testID="live-room-exit"
          accessibilityLabel={roomMode ? t('screens.liveRoom.leaveRoom') : t('screens.liveRoom.backToRooms')}
        >
          {roomMode ? t('screens.liveRoom.leave') : t('screens.liveRoom.back')}
        </Button>
        <View style={styles.titleBlock}>
          <Text weight="700" numberOfLines={1}>
            {sessionTitle ?? t('screens.liveRoom.defaultTitle')}
          </Text>
          <View style={styles.statusRow}>
            {isLive ? (
              <Badge variant="destructive" testID="live-room-live-badge">
                {t('screens.community.live')}
              </Badge>
            ) : null}
            {typeof inRoomCount === 'number' ? (
              <Text variant="caption" muted testID="live-room-viewer-count">
                {t('screens.liveRoom.inRoomCount', { count: inRoomCount })}
              </Text>
            ) : null}
          </View>
        </View>
        {isRoomHost && entry ? (
          <Button variant="destructive" size="sm" onPress={() => setEndOpen(true)} testID="live-room-end">
            {t('screens.liveRoom.endForEveryone')}
          </Button>
        ) : null}
      </View>

      {endFailed ? (
        <Text style={styles.notice} accessibilityRole="alert">
          {t('toasts.hooks.failedEndRoom')}
        </Text>
      ) : null}

      <View style={styles.body}>
        {!roomMode ? (
          isHostResolving ? (
            <Text muted>{t('common.loading')}</Text>
          ) : (
            <View style={styles.entry}>
              <Text variant="title" accessibilityRole="header">
                {isRoomHost ? t('screens.liveRoom.readyToStart') : t('screens.liveRoom.readyToJoin')}
              </Text>
              <Text muted>{isRoomHost ? t('screens.liveRoom.startHint') : t('screens.liveRoom.joinHint')}</Text>
              {!engine ? (
                <View testID="live-room-unavailable" style={styles.unavailable}>
                  <Text weight="600">{t('screens.community.videoRoomUnavailable')}</Text>
                  <Text variant="caption" muted>
                    {t('screens.community.videoRoomUnavailableHint')}
                  </Text>
                </View>
              ) : null}
              <Button onPress={handleEnter} disabled={!engine} testID="live-room-enter">
                {isRoomHost ? t('screens.liveRoom.startStream') : t('screens.liveRoom.joinStream')}
              </Button>
            </View>
          )
        ) : entry && Surface ? (
          <View style={styles.stage} testID="live-room-stage">
            <Surface
              roomUrl={entry.daily_room_url}
              token={entry.token}
              onJoined={() => {
                if (isRoomHost) void hostPresent(roomId).catch(() => undefined);
              }}
              onLeft={() => {
                if (isRoomHost) void hostAbsent(roomId).catch(() => undefined);
                leave();
              }}
              onError={() => setSurfaceFailed(true)}
            />
            {surfaceFailed ? (
              <Text variant="caption" accessibilityRole="alert" testID="live-room-surface-error">
                {t('toasts.community.videoError')}
              </Text>
            ) : null}
          </View>
        ) : enterError ? (
          <View testID="live-room-error" style={styles.centered}>
            <Text weight="600">{errorCopy(enterError).title}</Text>
            <Text muted>{errorCopy(enterError).desc}</Text>
            {enterError !== 'UNAUTHENTICATED' && enterError !== 'NOT_FOUND' ? (
              <Button variant="outline" onPress={handleEnter} testID="live-room-retry">
                {t('screens.community.retry')}
              </Button>
            ) : null}
          </View>
        ) : (
          <View testID="live-room-entering" style={styles.centered}>
            <Text muted>{t('screens.community.settingUpVideoRoom')}</Text>
          </View>
        )}
      </View>

      {endOpen ? (
        <BottomSheet open onClose={() => setEndOpen(false)} title={t('screens.liveRoom.endConfirmTitle')} testID="live-room-end-sheet">
          <View style={styles.entry}>
            <Text muted>{t('screens.liveRoom.endConfirmDesc')}</Text>
            <Button variant="destructive" onPress={endForEveryone} testID="live-room-end-confirm">
              {t('screens.liveRoom.endForEveryone')}
            </Button>
            <Button variant="ghost" onPress={() => setEndOpen(false)}>
              {t('screens.community.cancel')}
            </Button>
          </View>
        </BottomSheet>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1 },
  titleBlock: { flex: 1, minWidth: 0, gap: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { paddingHorizontal: 16, paddingVertical: 8 },
  body: { flex: 1, minHeight: 0 },
  entry: { gap: 12, padding: 24 },
  unavailable: { gap: 4, paddingVertical: 8 },
  stage: { flex: 1, minHeight: 0 },
});
