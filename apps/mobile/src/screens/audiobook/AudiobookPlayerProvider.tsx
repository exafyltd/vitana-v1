/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * native twin of `src/context/AudiobookPlayerProvider.tsx` (VTID-04761), the
 * app-wide Audiobook player. The web module runtime-imports
 * `@/lib/community-gateway` (:33), so it is class-B and re-implemented here,
 * not extracted; the pure queue rules come from `@vitana/core` (port).
 *
 * Same behaviour as the web provider:
 *  - `start()` loads the curriculum (`GET /journey-checklist?locale=`) and the
 *    journey state (`GET /journey/state`) through the same React Query keys
 *    and query functions My Journey uses, builds the queue, starts at the
 *    requested topic / episode or the first unheard episode, resumes the
 *    per-device position (key-value store instead of localStorage);
 *  - each topic is the gateway's rendered narration
 *    `GET /api/v1/journey/audiobook/topics/:id/audio?lang=` with the member's
 *    Bearer token and `X-Vitana-Active-Role: community`; 404 / 422 is
 *    "unavailable", any other failure "network" (web :171-198). Native
 *    streams the URL (a native player cannot play a blob URL); when the
 *    player reports an error the provider asks the gateway the same GET to
 *    tell "unavailable" from "network";
 *  - finishing a topic records it (`POST /journey/session-listened`, the
 *    optimistic journey-state cache, then a refetch) and plays the next one;
 *    the last topic of an episode shows the one end-of-episode card;
 *  - speed (1 → 1.25 → 1.5, stored per device), sleep timer (off → 15 → 30 →
 *    60 min), previous (restart after 3 s), next, Ask Vitana (pause + ORB),
 *    close, retry; the lock screen shows title / "Vitana" / album
 *    (web Media Session, :441-469); signing out stops playback.
 *
 * It also plugs the player into My Journey (journey lane seams, through the
 * dashboard port): `JourneyAudiobookContext` (hero "Play episode N", the
 * catalog's session play, the card strip) and the Guided view's
 * `AudiobookReminderControl` slot (`JourneySlotsContext`).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { deviceStorage } from '../../identity/device-storage';
import {
  audiobookStreamSource,
  buildAudiobookQueue,
  clearAudiobookPreload,
  createAudiobookAudio,
  findStartIndex,
  groupTopicsBySession,
  nextRate,
  nextSleepTimer,
  preloadAudiobookSource,
  previousIndex,
  setAudiobookAudioMode,
  type AudiobookAudio,
  type AudiobookAudioStatus,
  type AudiobookSource,
  type AudiobookTrack,
} from '../../ports/audiobook';
import {
  JOURNEY_STATE_QUERY_KEY,
  JourneyAudiobookContext,
  JourneySlotsContext,
  communityFetch,
  fetchJourneyChecklist,
  fetchJourneyState,
  journeyChecklistQueryKey,
  markSessionListenedInJourneyState,
  recordSessionListened,
  useActivateOrb,
  type JourneyAudiobook,
  type JourneySlots,
} from '../../ports/journey-dashboard';
import { emitAudiobookEvent } from './events';
import { AudiobookReminderControl } from './AudiobookReminderControl';

export type { AudiobookTrack };

export type AudiobookError = 'unavailable' | 'network' | 'empty' | null;

export interface EpisodeSummary {
  episode: number;
  topicId: string;
  practiceTarget: string | null;
}

export interface AudiobookPlayerApi {
  /** A queue is loaded and the mini player is showing. */
  active: boolean;
  playing: boolean;
  loading: boolean;
  error: AudiobookError;
  track: AudiobookTrack | null;
  /** Playback position of the current track, seconds. */
  position: number;
  duration: number;
  rate: number;
  /** Sleep timer setting in minutes (0 = off). */
  sleepMinutes: number;
  /** The episode that just finished — drives the one end-of-episode card. */
  episodeSummary: EpisodeSummary | null;
  /** True once the last track of the whole Audiobook has played. */
  finished: boolean;
  start: (opts?: { topicId?: string; episode?: number }) => Promise<void>;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  cycleRate: () => void;
  cycleSleep: () => void;
  /** Pause and open Vitana live on the current topic. */
  askVitana: () => void;
  dismissSummary: () => void;
  retry: () => void;
  close: () => void;
}

export const AudiobookPlayerContext = createContext<AudiobookPlayerApi | null>(null);

/** The Audiobook player. Null outside the provider (web :526-528). */
export function useAudiobookPlayer(): AudiobookPlayerApi | null {
  return useContext(AudiobookPlayerContext);
}

export const RATE_KEY = 'vitana.audiobook.rate.v1';
export const POSITION_PREFIX = 'vitana.audiobook.position.v1';
/** How many rendered tracks to keep fetched ahead (current + prefetched), web BLOB_CACHE_MAX. */
const PRELOAD_MAX = 3;

export function audiobookTrackPath(topicId: string, locale: string): string {
  return `/journey/audiobook/topics/${encodeURIComponent(topicId)}/audio?lang=${encodeURIComponent(locale)}`;
}

const positionKey = (userId: string | null) => `${POSITION_PREFIX}.${userId ?? 'anon'}`;

async function readPosition(userId: string | null): Promise<{ topicId: string; time: number } | null> {
  try {
    const raw = await deviceStorage.getItem(positionKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.topicId === 'string' && typeof parsed.time === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeValue(key: string, value: string) {
  void Promise.resolve(deviceStorage.setItem(key, value)).catch(() => undefined);
}

/** The Guided view's mount slots this lane fills (AutopilotDashboard.tsx:435). */
const SLOTS: JourneySlots = { AudiobookReminderControl };

export function AudiobookPlayerProvider({ children }: { children: ReactNode }): ReactElement {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { language, t } = useI18n();
  const locale = (language || 'de').split('-')[0];
  const queryClient = useQueryClient();
  const activateOrb = useActivateOrb();

  const audioRef = useRef<AudiobookAudio | null>(null);
  const queueRef = useRef<AudiobookTrack[]>([]);
  const indexRef = useRef(-1);
  /** `${locale}:${topicId}` of the source in the player (web: `audio.src === blobCache.get(key)`). */
  const loadedKeyRef = useRef<string | null>(null);
  /** Awaiting the player's first status for this load (clears `loading`, reports errors). */
  const pendingLoadRef = useRef<{ seq: number; topicId: string } | null>(null);
  const finishedSeqRef = useRef(-1);
  const preloaded = useRef(new Map<string, AudiobookSource>());
  const recordedRef = useRef(new Set<string>());
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeq = useRef(0);
  const rateRef = useRef(1);
  const positionRef = useRef(0);
  const advanceRef = useRef<() => void>(() => undefined);
  const classifyRef = useRef<(seq: number, topicId: string) => void>(() => undefined);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AudiobookError>(null);
  const [track, setTrack] = useState<AudiobookTrack | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [episodeSummary, setEpisodeSummary] = useState<EpisodeSummary | null>(null);
  const [finished, setFinished] = useState(false);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
  }, []);

  // The stored speed (web reads it synchronously from localStorage on mount).
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(deviceStorage.getItem(RATE_KEY)).then((v: string | null) => {
      const n = Number(v);
      if (!cancelled && v !== null && Number.isFinite(n) && n > 0) setRate(n);
    });
    return () => {
      cancelled = true;
    };
  }, [setRate]);

  const onStatus = useCallback((s: AudiobookAudioStatus) => {
    setPlaying(s.playing);
    setPosition(s.currentTime);
    positionRef.current = s.currentTime;
    if (s.duration > 0) setDuration(s.duration);
    const current = queueRef.current[indexRef.current];
    if (s.playing && current && Math.floor(s.currentTime) % 5 === 0) {
      writeValue(positionKey(userIdRef.current), JSON.stringify({ topicId: current.topicId, time: s.currentTime }));
    }
    const pending = pendingLoadRef.current;
    if (pending && pending.seq === loadSeq.current) {
      if (s.error) {
        pendingLoadRef.current = null;
        classifyRef.current(pending.seq, pending.topicId);
        return;
      }
      if (s.isLoaded || s.playing) {
        pendingLoadRef.current = null;
        setLoading(false);
      }
    } else if (s.error && current) {
      classifyRef.current(loadSeq.current, current.topicId);
      return;
    }
    if (s.didJustFinish && finishedSeqRef.current !== loadSeq.current) {
      finishedSeqRef.current = loadSeq.current;
      advanceRef.current();
    }
  }, []);

  const getAudio = useCallback((): AudiobookAudio => {
    if (!audioRef.current) {
      const audio = createAudiobookAudio();
      audio.onStatus(onStatus);
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [onStatus]);

  const trackKey = useCallback((topicId: string) => `${locale}:${topicId}`, [locale]);

  const prefetchNext = useCallback(async () => {
    const nextTrack = queueRef.current[indexRef.current + 1];
    if (!nextTrack) return;
    const key = trackKey(nextTrack.topicId);
    if (preloaded.current.has(key)) return;
    try {
      const source = await audiobookStreamSource(audiobookTrackPath(nextTrack.topicId, locale));
      preloaded.current.set(key, source);
      await preloadAudiobookSource(source);
    } catch {
      /* best effort */
    }
    // Bounded: drop the oldest fetched track that is not playing.
    while (preloaded.current.size > PRELOAD_MAX) {
      const [oldKey, oldSource] = preloaded.current.entries().next().value as [string, AudiobookSource];
      if (oldKey === loadedKeyRef.current) break;
      preloaded.current.delete(oldKey);
      void clearAudiobookPreload(oldSource).catch(() => undefined);
    }
  }, [locale, trackKey]);

  const playIndex = useCallback(
    async (index: number, resumeAt = 0) => {
      const target = queueRef.current[index];
      if (!target) return;
      const seq = ++loadSeq.current;
      indexRef.current = index;
      setTrack(target);
      setPosition(resumeAt);
      positionRef.current = resumeAt;
      setDuration(0);
      setError(null);
      setLoading(true);
      const audio = getAudio();
      try {
        const key = trackKey(target.topicId);
        const source = preloaded.current.get(key) ?? (await audiobookStreamSource(audiobookTrackPath(target.topicId, locale)));
        if (seq !== loadSeq.current) return; // a newer request won
        preloaded.current.delete(key);
        preloaded.current.set(key, source);
        pendingLoadRef.current = { seq, topicId: target.topicId };
        audio.replace(source);
        loadedKeyRef.current = key;
        audio.setRate(rateRef.current);
        if (resumeAt > 0) await audio.seekTo(resumeAt);
        audio.play();
        emitAudiobookEvent('track_started', { topicId: target.topicId, episode: target.episode, chapterId: target.chapterId });
        void prefetchNext();
      } catch {
        if (seq !== loadSeq.current) return;
        pendingLoadRef.current = null;
        audio.pause();
        setError('network');
        setLoading(false);
      }
    },
    [getAudio, locale, prefetchNext, trackKey],
  );

  // web fetchTrackUrl's status rule (:184-185), asked when the player fails.
  classifyRef.current = (seq: number, topicId: string) => {
    void (async () => {
      let kind: Exclude<AudiobookError, null> = 'network';
      try {
        const resp = await communityFetch(audiobookTrackPath(topicId, locale));
        if (resp.status === 422 || resp.status === 404) kind = 'unavailable';
      } catch {
        kind = 'network';
      }
      if (seq !== loadSeq.current) return;
      audioRef.current?.pause();
      loadedKeyRef.current = null;
      setError(kind);
      setLoading(false);
    })();
  };

  const recordListened = useCallback(
    (done: AudiobookTrack) => {
      if (recordedRef.current.has(done.topicId)) return;
      recordedRef.current.add(done.topicId);
      markSessionListenedInJourneyState(queryClient, done.episode, done.topicId, userId);
      void recordSessionListened(done.episode, done.topicId).finally(() => {
        void queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
      });
      emitAudiobookEvent('track_completed', { topicId: done.topicId, episode: done.episode, chapterId: done.chapterId });
      if (done.endsEpisode) emitAudiobookEvent('episode_completed', { episode: done.episode, chapterId: done.chapterId });
    },
    [queryClient, userId],
  );

  const advance = useCallback(() => {
    const done = queueRef.current[indexRef.current];
    if (done) {
      writeValue(positionKey(userId), '');
      recordListened(done);
      if (done.endsEpisode) setEpisodeSummary({ episode: done.episode, topicId: done.topicId, practiceTarget: done.practiceTarget });
    }
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= queueRef.current.length) {
      setPlaying(false);
      setFinished(true);
      emitAudiobookEvent('audiobook_finished', {});
      return;
    }
    void playIndex(nextIndex);
  }, [playIndex, recordListened, userId]);
  advanceRef.current = advance;

  const start = useCallback(
    async (opts: { topicId?: string; episode?: number } = {}) => {
      void setAudiobookAudioMode().catch(() => undefined);
      getAudio();
      setActive(true);
      setFinished(false);
      setEpisodeSummary(null);
      setError(null);
      setLoading(true);
      try {
        const [topics, state] = await Promise.all([
          queryClient.fetchQuery({ queryKey: journeyChecklistQueryKey(locale), queryFn: () => fetchJourneyChecklist(locale), staleTime: 10 * 60 * 1000 }),
          queryClient.fetchQuery({ queryKey: JOURNEY_STATE_QUERY_KEY, queryFn: () => fetchJourneyState(userId), staleTime: 60 * 1000 }),
        ]);
        const queue = buildAudiobookQueue(groupTopicsBySession(topics));
        queueRef.current = queue;
        const listened = new Set<number>(state?.completedSessionNumbers ?? []);
        const index = findStartIndex(queue, { topicId: opts.topicId, episode: opts.episode, listenedEpisodes: listened });
        if (index < 0) {
          setLoading(false);
          setError('empty');
          return;
        }
        const saved = await readPosition(userId);
        const resumeAt = saved && saved.topicId === queue[index].topicId ? saved.time : 0;
        emitAudiobookEvent('play_started', {
          topicId: queue[index].topicId,
          episode: queue[index].episode,
          source: opts.topicId ? 'topic' : opts.episode ? 'episode' : 'resume',
        });
        await playIndex(index, resumeAt);
      } catch {
        setLoading(false);
        setError('network');
      }
    },
    [getAudio, locale, playIndex, queryClient, userId],
  );

  const toggle = useCallback(() => {
    const audio = getAudio();
    if (!audio.playing) {
      const current = queueRef.current[indexRef.current];
      const loaded = !!current && loadedKeyRef.current === trackKey(current.topicId);
      if (!loaded && indexRef.current >= 0) void playIndex(indexRef.current, positionRef.current);
      else audio.play();
    } else {
      audio.pause();
    }
  }, [getAudio, playIndex, trackKey]);

  const next = useCallback(() => {
    if (indexRef.current + 1 < queueRef.current.length) void playIndex(indexRef.current + 1);
  }, [playIndex]);

  const previous = useCallback(() => {
    const audio = getAudio();
    const target = previousIndex(indexRef.current, audio.currentTime);
    if (target === indexRef.current) void audio.seekTo(0);
    else void playIndex(target);
  }, [getAudio, playIndex]);

  const cycleRate = useCallback(() => {
    const n = nextRate(rateRef.current);
    getAudio().setRate(n);
    writeValue(RATE_KEY, String(n));
    setRate(n);
  }, [getAudio, setRate]);

  const cycleSleep = useCallback(() => {
    setSleepMinutes((m) => {
      const n = nextSleepTimer(m);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = n
        ? setTimeout(() => {
            getAudio().pause();
            setSleepMinutes(0);
          }, n * 60 * 1000)
        : null;
      return n;
    });
  }, [getAudio]);

  const askVitana = useCallback(() => {
    getAudio().pause();
    const current = queueRef.current[indexRef.current];
    emitAudiobookEvent('ask_vitana', { topicId: current?.topicId ?? null });
    activateOrb(current?.topicId);
  }, [activateOrb, getAudio]);

  const close = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    loadSeq.current++;
    pendingLoadRef.current = null;
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepMinutes(0);
    setActive(false);
    setTrack(null);
    setEpisodeSummary(null);
    setError(null);
    setLoading(false);
  }, [getAudio]);

  const retry = useCallback(() => {
    if (indexRef.current >= 0) void playIndex(indexRef.current, positionRef.current);
    else void start();
  }, [playIndex, start]);

  const dismissSummary = useCallback(() => setEpisodeSummary(null), []);

  // Lock screen / notification shade (web Media Session).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.setLockScreen(track ? { title: track.title, artist: 'Vitana', albumTitle: t('screens.audiobook.albumTitle', { n: track.episode }) } : null);
    } catch {
      /* in-app controls still work */
    }
  }, [track, t]);

  // Signing out stops playback.
  useEffect(() => {
    if (!userId && active) close();
  }, [userId, active, close]);

  useEffect(() => {
    const cache = preloaded.current;
    return () => {
      cache.forEach((source) => void clearAudiobookPreload(source).catch(() => undefined));
      cache.clear();
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      audioRef.current?.remove();
      audioRef.current = null;
    };
  }, []);

  const value = useMemo<AudiobookPlayerApi>(
    () => ({
      active,
      playing,
      loading,
      error,
      track,
      position,
      duration,
      rate,
      sleepMinutes,
      episodeSummary,
      finished,
      start,
      toggle,
      next,
      previous,
      cycleRate,
      cycleSleep,
      askVitana,
      dismissSummary,
      retry,
      close,
    }),
    [active, playing, loading, error, track, position, duration, rate, sleepMinutes, episodeSummary, finished, start, toggle, next, previous, cycleRate, cycleSleep, askVitana, dismissSummary, retry, close],
  );
  const journeyAudiobook = useMemo<JourneyAudiobook>(() => ({ active, start }), [active, start]);

  return (
    <AudiobookPlayerContext.Provider value={value}>
      <JourneyAudiobookContext.Provider value={journeyAudiobook}>
        <JourneySlotsContext.Provider value={SLOTS}>{children}</JourneySlotsContext.Provider>
      </JourneyAudiobookContext.Provider>
    </AudiobookPlayerContext.Provider>
  );
}
