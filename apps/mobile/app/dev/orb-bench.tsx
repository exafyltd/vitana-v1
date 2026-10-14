/**
 * VTID-05182 — the native ORB echo bench (plan Change 11; N6b shipped the
 * tone and verdict, this screen wires them to the duplex gate and the voice
 * module). The native equivalent of ORB Voice Bench tab 2: no network, no
 * session — it measures the room for 1.2 s, plays the bench tone through
 * `VitanaVoice.enqueue` at 1.0×, 1.05× or 1.1×, and counts duplex-gate
 * openings with the same gate a live session uses. Echo mode passes only with
 * zero openings; speech mode passes when a barge-in confirms. "Share result"
 * exports the run as JSON for the device checklist.
 *
 * Development and test-g1 builds only (the only profiles that exist; any
 * other renders a notice). Parity ledger: `native_only` "/dev/orb-bench".
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Text, useUITheme } from '../../src/ports/ui';
import { useI18n } from '../../src/i18n/I18nProvider';
import { BENCH_RATES, EchoBench, type BenchResult } from '../../src/orb/bench';
import { getVitanaVoice, type VoiceCapabilities, type Subscription } from '../../modules/vitana-voice/src/VitanaVoice';
import { BENCH_TONE, benchToneChunks, type BenchMode } from '../../modules/vitana-voice/src/bench-tone';

const BENCH_PROFILES = ['development', 'test-g1'];

function benchAllowed(): boolean {
  const profile = (Constants.expoConfig?.extra as { profile?: string } | undefined)?.profile;
  return !!profile && BENCH_PROFILES.includes(profile);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function deviceModel(): string {
  const c = Platform.constants as unknown as Record<string, unknown>;
  const model = [c.Manufacturer, c.Model].filter((x) => typeof x === 'string').join(' ');
  return model || (typeof c.interfaceIdiom === 'string' ? `${Platform.OS} ${c.interfaceIdiom}` : Platform.OS);
}

function Choice({ testID, label, selected, onPress }: { testID: string; label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useUITheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.accent : colors.background }]}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

function Action({ testID, label, onPress, disabled }: { testID: string; label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useUITheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export default function OrbBench() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [mode, setMode] = useState<BenchMode>('echo');
  const [rate, setRate] = useState<number>(BENCH_RATES[1]);
  const [phase, setPhase] = useState<'idle' | 'noise' | 'playing'>('idle');
  const [result, setResult] = useState<BenchResult | null>(null);
  const [caps, setCaps] = useState<VoiceCapabilities | null>(null);
  const [route, setRoute] = useState<string>('—');
  const [denied, setDenied] = useState(false);
  const run = useRef(0);

  useEffect(() => () => {
    run.current++;
  }, []);

  if (!benchAllowed()) {
    return (
      <View testID="orb-bench-unavailable" style={[styles.root, { backgroundColor: colors.background }]}>
        <Text>{t('orbNative.bench.unavailable')}</Text>
      </View>
    );
  }

  async function start() {
    const my = ++run.current;
    const voice = getVitanaVoice();
    setResult(null);
    setDenied(false);
    let permission = await voice.getMicrophonePermission();
    if (permission.status !== 'granted') permission = await voice.requestMicrophonePermission();
    if (permission.status !== 'granted') {
      setDenied(true);
      return;
    }
    setCaps(await voice.getCapabilities());
    const bench = new EchoBench(mode, rate, () => voice.stopPlayback());
    const subs: Subscription[] = [
      voice.addListener('onFrame', (f) => bench.onFrame(f)),
      voice.addListener('onPlaybackState', (s) => bench.onPlaybackState(s)),
      voice.addListener('onRouteChange', (r) => setRoute(r.output)),
    ];
    try {
      await voice.start({ leadFirstOnly: false, playbackRate: rate });
      bench.startNoiseFloor();
      setPhase('noise');
      await sleep(BENCH_TONE.NOISE_FLOOR_MS);
      if (my !== run.current) return;
      bench.startPlayback();
      setPhase('playing');
      for (const chunk of benchToneChunks()) voice.enqueue(chunk, BENCH_TONE.SAMPLE_RATE);
      await sleep(BENCH_TONE.PLAYBACK_MS / rate + 1000);
      if (my !== run.current) return;
      const r = bench.finish();
      setResult(r);
      // The device log is where the device checklist reads bench runs.
      console.log('[orb-bench]', JSON.stringify(r));
    } finally {
      for (const s of subs) s.remove();
      voice.stopPlayback();
      await voice.stop().catch(() => undefined);
      if (my === run.current) setPhase('idle');
    }
  }

  function cancel() {
    run.current++;
    setPhase('idle');
    const voice = getVitanaVoice();
    voice.stopPlayback();
    void voice.stop().catch(() => undefined);
  }

  function share() {
    if (!result) return;
    const payload = { bench: 'orb-echo', result, capabilities: caps, device: deviceModel(), os: `${Platform.OS} ${String(Platform.Version)}`, route };
    void Share.share({ message: JSON.stringify(payload, null, 2) }).catch(() => undefined);
  }

  const busy = phase !== 'idle';
  const fmt = (n: number) => n.toFixed(4);

  return (
    <ScrollView testID="orb-bench" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.root}>
      <Text variant="title" accessibilityRole="header">
        {t('orbNative.bench.title')}
      </Text>
      <Text muted>{t('orbNative.bench.intro')}</Text>

      <View style={styles.row} accessibilityRole="radiogroup">
        <Choice testID="orb-bench-mode-echo" label={t('orbNative.bench.modeEcho')} selected={mode === 'echo'} onPress={() => !busy && setMode('echo')} />
        <Choice testID="orb-bench-mode-speech" label={t('orbNative.bench.modeSpeech')} selected={mode === 'speech'} onPress={() => !busy && setMode('speech')} />
      </View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {BENCH_RATES.map((r) => (
          <Choice key={r} testID={`orb-bench-rate-${r}`} label={t('orbNative.bench.rate', { rate: r.toFixed(2) })} selected={rate === r} onPress={() => !busy && setRate(r)} />
        ))}
      </View>

      {busy ? <Action testID="orb-bench-stop" label={t('orbNative.bench.stop')} onPress={cancel} /> : <Action testID="orb-bench-start" label={t('orbNative.bench.start')} onPress={() => void start()} />}

      <Text testID="orb-bench-phase" accessibilityLiveRegion="polite">
        {t(phase === 'noise' ? 'orbNative.bench.phaseNoiseFloor' : phase === 'playing' ? 'orbNative.bench.phasePlaying' : 'orbNative.bench.phaseIdle')}
      </Text>
      {denied ? <Text testID="orb-bench-denied">{t('screens.ui.microphoneAccessDenied')}</Text> : null}

      {result ? (
        <View testID="orb-bench-result" style={styles.result}>
          <Text variant="title" style={{ color: result.verdict.pass ? colors.primary : colors.destructive }}>
            {t(result.verdict.pass ? 'orbNative.bench.pass' : 'orbNative.bench.fail')}
          </Text>
          <Text>{t('orbNative.bench.openings', { count: result.openingsDuringPlayback })}</Text>
          <Text>{t('orbNative.bench.barges', { count: result.bargeCount })}</Text>
          <Text>{t('orbNative.bench.peak', { value: fmt(result.peakDuringPlayback) })}</Text>
          <Text>{t('orbNative.bench.noiseFloor', { value: fmt(result.noiseFloorPeak) })}</Text>
          {result.stopLatencyMs !== null ? <Text>{t('orbNative.bench.stopLatency', { value: result.stopLatencyMs.toFixed(1) })}</Text> : null}
          {result.verdict.noisyRoom ? <Text muted>{t('orbNative.bench.noisyRoom')}</Text> : null}
          <Action testID="orb-bench-share" label={t('orbNative.bench.share')} onPress={share} />
        </View>
      ) : null}

      <View style={styles.result}>
        <Text muted>{t('orbNative.bench.device', { value: deviceModel() })}</Text>
        <Text muted>{t('orbNative.bench.os', { value: `${Platform.OS} ${String(Platform.Version)}` })}</Text>
        <Text muted>{t('orbNative.bench.route', { value: route })}</Text>
        {caps ? (
          <>
            <Text muted>{t('orbNative.bench.aecPath', { value: caps.aecPath })}</Text>
            <Text muted>{t('orbNative.bench.voiceProcessing', { value: t(caps.voiceProcessing ? 'orbNative.bench.on' : 'orbNative.bench.off') })}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  action: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  result: { gap: 4 },
});
