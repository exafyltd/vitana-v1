/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * Audiobook lane's port: everything the native player, mini player and
 * reminder control take from outside `src/screens/audiobook/`.
 *
 *  - `@vitana/core/audiobook-queue` — the web's pure play-queue rules
 *    (`src/lib/audiobook/queue.ts`: queue order, start index, previous, speed
 *    and sleep-timer cycles), single-sourced in core, never re-implemented.
 *  - `expo-audio` — the native `<audio>` element (program library map §3).
 *    The web fetches each topic MP3 with `communityFetch` (Bearer token +
 *    `X-Vitana-Active-Role: community`) and plays a blob URL; native players
 *    cannot play a blob URL, so the player streams the same gateway URL with
 *    the same headers (`audiobookStreamSource`, built by N1's
 *    `createGatewayFetch`, so URL and Authorization match the gateway client).
 *  - the N2 kit parts the screens draw (Select, reduced motion) and the
 *    lucide glyphs of the web mini player / reminder control.
 * Screen files read these only through this port (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  createAudioPlayer,
  clearPreloadedSource,
  preload,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import { Bell, Headphones, Loader2, MessageCircle, Moon, Pause, Play, SkipBack, SkipForward, Sparkles, X, type LucideProps } from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';
import { createGatewayFetch } from './core';
import { config, endpoints } from './env';
import { getAccessToken } from '../auth/client';

export { useReducedMotion, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vitana/ui';

// ── @vitana/core: the web's pure queue rules ─────────────────────────────
export {
  buildAudiobookQueue,
  findStartIndex,
  groupTopicsBySession,
  nextRate,
  nextSleepTimer,
  previousIndex,
  type AudiobookTrack,
} from '@vitana/core/audiobook-queue';

// ── the gateway stream source ────────────────────────────────────────────
export type AudiobookSource = { uri: string; headers: Record<string, string> };

let originOverride: string | null = null;

/** Tests point the stream at the fixture gateway origin (the app reads it from the env port). */
export function __setAudiobookOriginForTests(origin: string | null): void {
  originOverride = origin;
}

/**
 * The URL and headers `communityFetch(path)` sends (web community-gateway.ts:7-25),
 * built by N1's gateway client with a capturing transport: nothing is fetched here.
 */
export async function audiobookStreamSource(path: string): Promise<AudiobookSource> {
  let captured: AudiobookSource | null = null;
  const capture = async (url: string, init?: RequestInit) => {
    captured = { uri: url, headers: { ...((init?.headers as Record<string, string> | undefined) ?? {}) } };
    return {} as Response;
  };
  const origin = originOverride ?? endpoints(config).gatewayOrigin;
  await createGatewayFetch({ origin, getAccessToken, fetchImpl: capture })(path, { headers: { 'X-Vitana-Active-Role': 'community' } });
  return captured as unknown as AudiobookSource;
}

// ── the audio element ────────────────────────────────────────────────────
export type AudiobookAudioStatus = Pick<AudioStatus, 'playing' | 'currentTime' | 'duration' | 'didJustFinish' | 'isLoaded' | 'error'>;

export type AudiobookLockScreen = { title: string; artist: string; albumTitle: string };

/** The few `AudioPlayer` calls the provider makes (web HTMLAudioElement: src, play, pause, currentTime, playbackRate). */
export interface AudiobookAudio {
  replace(source: AudiobookSource): void;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  setRate(rate: number): void;
  readonly currentTime: number;
  readonly duration: number;
  readonly playing: boolean;
  onStatus(listener: (status: AudiobookAudioStatus) => void): () => void;
  /** web Media Session metadata (AudiobookPlayerProvider.tsx:441-469); null clears it. */
  setLockScreen(meta: AudiobookLockScreen | null): void;
  remove(): void;
}

/** One `expo-audio` player, created on first use (web `getAudio()`, :162-169). */
export function createAudiobookAudio(): AudiobookAudio {
  const player: AudioPlayer = createAudioPlayer(null, { updateInterval: 500 });
  return {
    replace: (source) => player.replace(source),
    play: () => player.play(),
    pause: () => player.pause(),
    seekTo: (seconds) => player.seekTo(seconds),
    setRate: (rate) => player.setPlaybackRate(rate),
    get currentTime() {
      return player.currentTime;
    },
    get duration() {
      return player.duration;
    },
    get playing() {
      return player.playing;
    },
    onStatus: (listener) => {
      const sub = player.addListener('playbackStatusUpdate', listener);
      return () => sub.remove();
    },
    setLockScreen: (meta) => {
      if (meta) player.setActiveForLockScreen(true, meta, { showSeekBackward: true, showSeekForward: true });
      else player.clearLockScreenControls();
    },
    remove: () => player.remove(),
  };
}

/** Plays through the silent switch (iOS) and owns the audio focus while listening, so the lock screen shows the player. */
export function setAudiobookAudioMode(): Promise<void> {
  return setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
}

/** web `prefetchNext()` (:200-203): fetch the next topic ahead of time. Best effort. */
export function preloadAudiobookSource(source: AudiobookSource): Promise<void> {
  return preload(source);
}

export function clearAudiobookPreload(source: AudiobookSource): Promise<void> {
  return clearPreloadedSource(source);
}

// ── colours and glyphs ───────────────────────────────────────────────────
export type AudiobookTone = 'category-2' | 'category-4';

/** A `--category-*` token for the current scheme (`#rrggbb`). */
export function useAudiobookTone(tone: AudiobookTone): string {
  const { scheme } = useTheme();
  return color(tone, scheme);
}

/** `#rrggbb` (or an `hsl()` token) at an alpha (the web's `/15`-style modifiers). */
export function toneAlpha(value: string, a: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const hsl = /^hsl\(([^)]+)\)$/.exec(value.trim());
  if (hsl) return `hsla(${hsl[1]}, ${a})`;
  return value;
}

const ICONS: Record<string, ComponentType<LucideProps>> = { Bell, Headphones, Loader2, MessageCircle, Moon, Pause, Play, SkipBack, SkipForward, Sparkles, X };

/** A lucide glyph of the web audiobook components; decorative (hidden from a11y). `mirror` flips it in RTL (web `rtl:-scale-x-100`). */
export function AudiobookIcon({ name, size = 20, color: tint, mirror = false }: { name: keyof typeof ICONS | string; size?: number; color?: string; mirror?: boolean }) {
  const { colors, direction } = useTheme();
  const Glyph = ICONS[name] ?? X;
  return (
    <View
      testID={`audiobook-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: mirror && direction === 'rtl' ? [{ scaleX: -1 }] : undefined }}
    >
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}
