/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the voice
 * message player in a bubble, native twin of web `VoiceMessagePlayer`
 * (MessageBubble.tsx:93-171): play / pause, a progress bar, the mic glyph and
 * m:ss (the stored duration until playback starts, then the position). The
 * player is created on the first tap (web `new Audio(url)` on first toggle)
 * through the device port and released when the bubble goes away.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../../ports/ui';
import { ChatIcon } from '../../../ports/chat';
import { getChatDevice, type SoundPlayer } from '../../../ports/chat-device';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatClock } from '../VoiceRecorder';

export function VoicePlayer({ url, duration, isOwn }: { url?: string; duration?: number; isOwn: boolean }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const player = useRef<SoundPlayer | null>(null);
  const safe = duration && Number.isFinite(duration) ? duration : 0;
  const fg = isOwn ? colors.primaryForeground : colors.foreground;

  useEffect(() => () => player.current?.release(), []);

  const toggle = () => {
    if (!player.current) {
      if (!url) return;
      const p = getChatDevice().createPlayer(url);
      p.onStatus((s) => {
        setCurrent(s.currentTime);
        if (s.duration && Number.isFinite(s.duration)) setProgress((s.currentTime / s.duration) * 100);
        if (s.didJustFinish) {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }
      });
      player.current = p;
      p.play();
      setPlaying(true);
      return;
    }
    if (playing) player.current.pause();
    else player.current.play();
    setPlaying(!playing);
  };

  return (
    <View style={styles.root} testID="voice-player">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={t(playing ? 'chatNative.voice.pause' : 'chatNative.voice.play')}
        style={[styles.button, { backgroundColor: isOwn ? colors.background : colors.accent }]}
        testID="voice-player-toggle"
      >
        <ChatIcon name={playing ? 'Pause' : 'Play'} size={14} />
      </Pressable>
      <View style={styles.col}>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${progress}%`, backgroundColor: isOwn ? colors.primaryForeground : colors.primary }]} />
        </View>
        <View style={styles.meta}>
          <ChatIcon name="Mic" size={12} color={fg} />
          <Text style={[styles.time, { color: fg }]} testID="voice-player-time">
            {formatClock(current > 0 ? current : safe)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180, maxWidth: 260 },
  button: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  col: { flex: 1, gap: 4 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
