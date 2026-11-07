/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the voice
 * recorder that replaces the composer bar (web
 * `src/components/ui/voice-recorder.tsx`, MessageInput.tsx:686-694):
 *
 *  - on open it asks for the microphone ("Starting recorder…"; a refusal shows
 *    "Microphone access denied");
 *  - recording: delete, a running m:ss timer, stop;
 *  - review: delete, play / pause of the take, m:ss, send.
 * The recorder is the `expo-audio` one from the device port; the take is
 * played back with the port's player. The icon buttons get labels the web
 * leaves out (`chatNative.voice.*`).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { getChatDevice, type SoundPlayer } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Phase = 'starting' | 'denied' | 'recording' | 'review';

export function VoiceRecorder({ onComplete, onCancel, disabled }: { onComplete: (recording: { uri: string; mimeType: string }, duration: number) => void; onCancel: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const recorder = getChatDevice().useRecorder();
  const [phase, setPhase] = useState<Phase>('starting');
  const [duration, setDuration] = useState(0);
  const [take, setTake] = useState<{ uri: string; mimeType: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const started = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const player = useRef<SoundPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    void recorder
      .start()
      .then((r) => {
        if (cancelled) return;
        if (r === 'denied') {
          setPhase('denied');
          return;
        }
        started.current = Date.now();
        setPhase('recording');
        ticker.current = setInterval(() => setDuration((Date.now() - started.current) / 1000), 250);
      })
      .catch(() => !cancelled && setPhase('denied'));
    return () => {
      cancelled = true;
      if (ticker.current) clearInterval(ticker.current);
      recorder.cancel();
      player.current?.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = async () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
    setDuration((Date.now() - started.current) / 1000);
    const rec = await recorder.stop();
    if (!rec) {
      onCancel();
      return;
    }
    setTake(rec);
    setPhase('review');
  };

  const cancel = () => {
    if (ticker.current) clearInterval(ticker.current);
    recorder.cancel();
    player.current?.release();
    player.current = null;
    onCancel();
  };

  const togglePlay = () => {
    if (!take) return;
    if (!player.current) {
      const p = getChatDevice().createPlayer(take.uri);
      p.onStatus((s) => {
        setPosition(s.currentTime);
        if (s.didJustFinish) {
          setPlaying(false);
          setPosition(0);
        }
      });
      player.current = p;
    }
    if (playing) player.current.pause();
    else player.current.play();
    setPlaying(!playing);
  };

  const send = () => {
    if (!take) return;
    player.current?.release();
    player.current = null;
    onComplete(take, duration);
  };

  if (phase === 'denied') {
    return (
      <View style={styles.row} testID="voice-recorder-denied">
        <Text style={{ color: colors.destructive }}>{t('screens.ui.microphoneAccessDenied')}</Text>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('chatNative.voice.discard')} style={styles.round} testID="voice-recorder-close">
          <ChatIcon name="X" size={16} />
        </Pressable>
      </View>
    );
  }
  if (phase === 'starting') {
    return (
      <View style={styles.row} testID="voice-recorder-starting">
        <Text muted>{t('screens.ui.startingRecorder')}</Text>
      </View>
    );
  }
  const progress = phase === 'review' && duration > 0 ? Math.min(1, position / duration) : 0;
  return (
    <View style={styles.row} testID={phase === 'recording' ? 'voice-recorder-recording' : 'voice-recorder-review'}>
      <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel={t('chatNative.voice.discard')} style={styles.round} testID="voice-recorder-discard">
        <ChatIcon name="Trash2" size={16} color={colors.destructive} />
      </Pressable>
      {phase === 'review' ? (
        <Pressable onPress={togglePlay} accessibilityRole="button" accessibilityLabel={t(playing ? 'chatNative.voice.pause' : 'chatNative.voice.play')} style={styles.round} testID="voice-recorder-play">
          <ChatIcon name={playing ? 'Pause' : 'Play'} size={16} />
        </Pressable>
      ) : (
        <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
      )}
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text muted style={styles.clock} testID="voice-recorder-time">
        {formatClock(phase === 'review' && position > 0 ? position : duration)}
      </Text>
      {phase === 'recording' ? (
        <Pressable onPress={() => void stop()} accessibilityRole="button" accessibilityLabel={t('chatNative.voice.stop')} style={[styles.round, { backgroundColor: colors.primary }]} testID="voice-recorder-stop">
          <ChatIcon name="Square" size={12} color={colors.primaryForeground} />
        </Pressable>
      ) : (
        <Pressable onPress={send} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('screens.messages.sendMessage')} style={[styles.round, { backgroundColor: colors.primary }]} testID="voice-recorder-send">
          <ChatIcon name="Send" size={16} color={colors.primaryForeground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 4 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%' },
  clock: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
