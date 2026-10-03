/**
 * VTID-04761 — Audiobook listening mode: the global player.
 *
 * One Play and the Audiobook runs by itself: topic after topic, episode after
 * episode, as plain audio. No microphone and no live voice session — the
 * narration is the pre-rendered curriculum audio the gateway serves per topic
 * (GET /api/v1/journey/audiobook/topics/:id/audio, Polly, Vitana's voice).
 * Talking to Vitana stays one tap away ("Ask Vitana"), never the default.
 *
 * Mounted once, app-wide, so playback continues while the member moves
 * around the app; the lock screen / notification shade controls it through
 * the Media Session API.
 *
 * Progress: finishing a topic records the episode as listened through the
 * same endpoint and cache the catalog tap uses (session-listened → durable
 * current_session + the +2 Vitana Index award), so the hero ring, the Home
 * card and another device all agree. The playback position inside a topic is
 * a per-device convenience in localStorage.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { communityFetch } from '@/lib/community-gateway';
import { getI18nLocale, t } from '@/lib/i18n-toast';
import { activateOrb } from '@/lib/orbActivate';
import { recordSessionListened } from '@/lib/journeyPractice';
import { fetchJourneyChecklist, journeyChecklistQueryKey } from '@/hooks/useJourneyChecklist';
import {
  JOURNEY_STATE_QUERY_KEY,
  fetchJourneyState,
  markSessionListenedInJourneyState,
} from '@/hooks/useGuidedJourneyProgress';
import {
  type AudiobookTrack,
  buildAudiobookQueue,
  findStartIndex,
  groupTopicsBySession,
  nextRate,
  nextSleepTimer,
  previousIndex,
} from '@/lib/audiobook/queue';
import { emitAudiobookEvent } from '@/lib/audiobook/events';
import { unlockAudioElement } from '@/lib/audiobook/unlock';

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

/** Exported for isolated renders (visual harness, tests); the app uses the provider. */
export const AudiobookPlayerContext = createContext<AudiobookPlayerApi | null>(null);

const RATE_KEY = 'vitana.audiobook.rate.v1';
const POSITION_PREFIX = 'vitana.audiobook.position.v1';
/** How many rendered tracks to keep as object URLs (current + prefetched). */
const BLOB_CACHE_MAX = 3;

function readNumber(key: string, fallback: number): number {
  try {
    const v = Number(window.localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* per-device convenience only */
  }
}

function readPosition(userId: string | null): { topicId: string; time: number } | null {
  try {
    const raw = window.localStorage.getItem(`${POSITION_PREFIX}.${userId ?? 'anon'}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.topicId === 'string' && typeof parsed.time === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

class AudiobookFetchError extends Error {
  constructor(public readonly kind: 'unavailable' | 'network') {
    super(kind);
  }
}

export function AudiobookPlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { selectedLanguage } = useLanguage();
  const locale = (selectedLanguage || getI18nLocale() || 'de').split('-')[0];
  const queryClient = useQueryClient();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AudiobookTrack[]>([]);
  const indexRef = useRef(-1);
  const blobCache = useRef(new Map<string, string>());
  const recordedRef = useRef(new Set<string>());
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeq = useRef(0);

  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AudiobookError>(null);
  const [track, setTrack] = useState<AudiobookTrack | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(() => (typeof window === 'undefined' ? 1 : readNumber(RATE_KEY, 1)));
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [episodeSummary, setEpisodeSummary] = useState<EpisodeSummary | null>(null);
  const [finished, setFinished] = useState(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const fetchTrackUrl = useCallback(
    async (topicId: string): Promise<string> => {
      const key = `${locale}:${topicId}`;
      const cached = blobCache.current.get(key);
      if (cached) return cached;
      let resp: Response;
      try {
        resp = await communityFetch(
          `/api/v1/journey/audiobook/topics/${encodeURIComponent(topicId)}/audio?lang=${encodeURIComponent(locale)}`,
        );
      } catch {
        throw new AudiobookFetchError('network');
      }
      if (resp.status === 422 || resp.status === 404) throw new AudiobookFetchError('unavailable');
      if (!resp.ok) throw new AudiobookFetchError('network');
      const url = URL.createObjectURL(await resp.blob());
      blobCache.current.set(key, url);
      // Bounded: drop the oldest rendered track.
      while (blobCache.current.size > BLOB_CACHE_MAX) {
        const [oldKey, oldUrl] = blobCache.current.entries().next().value as [string, string];
        if (oldUrl === audioRef.current?.src) break;
        URL.revokeObjectURL(oldUrl);
        blobCache.current.delete(oldKey);
      }
      return url;
    },
    [locale],
  );

  const prefetchNext = useCallback(() => {
    const nextTrack = queueRef.current[indexRef.current + 1];
    if (nextTrack) void fetchTrackUrl(nextTrack.topicId).catch(() => {});
  }, [fetchTrackUrl]);

  const playIndex = useCallback(
    async (index: number, resumeAt = 0) => {
      const queue = queueRef.current;
      const target = queue[index];
      if (!target) return;
      const seq = ++loadSeq.current;
      indexRef.current = index;
      setTrack(target);
      setPosition(resumeAt);
      setDuration(0);
      setError(null);
      setLoading(true);
      const audio = getAudio();
      try {
        const url = await fetchTrackUrl(target.topicId);
        if (seq !== loadSeq.current) return; // a newer request won
        audio.src = url;
        audio.playbackRate = rate;
        if (resumeAt > 0) audio.currentTime = resumeAt;
        await audio.play();
        emitAudiobookEvent('track_started', {
          topicId: target.topicId,
          episode: target.episode,
          chapterId: target.chapterId,
        });
        prefetchNext();
      } catch (err) {
        if (seq !== loadSeq.current) return;
        audio.pause();
        if (err instanceof AudiobookFetchError) {
          setError(err.kind);
        } else {
          // Autoplay was blocked (no user gesture yet): stay ready, paused.
          setPlaying(false);
        }
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [fetchTrackUrl, getAudio, prefetchNext, rate],
  );

  const recordListened = useCallback(
    (done: AudiobookTrack) => {
      if (recordedRef.current.has(done.topicId)) return;
      recordedRef.current.add(done.topicId);
      markSessionListenedInJourneyState(queryClient, done.episode, done.topicId, userId);
      void recordSessionListened(done.episode, done.topicId).finally(() => {
        queryClient.invalidateQueries({ queryKey: JOURNEY_STATE_QUERY_KEY });
      });
      emitAudiobookEvent('track_completed', { topicId: done.topicId, episode: done.episode, chapterId: done.chapterId });
      if (done.endsEpisode) emitAudiobookEvent('episode_completed', { episode: done.episode, chapterId: done.chapterId });
    },
    [queryClient, userId],
  );

  const advance = useCallback(() => {
    const done = queueRef.current[indexRef.current];
    if (done) {
      writeValue(`${POSITION_PREFIX}.${userId ?? 'anon'}`, '');
      recordListened(done);
      if (done.endsEpisode) {
        setEpisodeSummary({ episode: done.episode, topicId: done.topicId, practiceTarget: done.practiceTarget });
      }
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

  // Wire the audio element once.
  useEffect(() => {
    const audio = getAudio();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setPosition(audio.currentTime);
      const current = queueRef.current[indexRef.current];
      if (current && Math.floor(audio.currentTime) % 5 === 0) {
        writeValue(
          `${POSITION_PREFIX}.${userId ?? 'anon'}`,
          JSON.stringify({ topicId: current.topicId, time: audio.currentTime }),
        );
      }
    };
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    // The unlock silence (a data: URI) ending is not a finished topic.
    const onEnded = () => {
      if (audio.src.startsWith('data:')) return;
      advance();
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [advance, getAudio, userId]);

  const start = useCallback(
    async (opts: { topicId?: string; episode?: number } = {}) => {
      // Must run inside the tap, before the first await (see unlock.ts).
      unlockAudioElement(getAudio());
      setActive(true);
      setFinished(false);
      setEpisodeSummary(null);
      setError(null);
      setLoading(true);
      try {
        const [topics, state] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: journeyChecklistQueryKey(locale),
            queryFn: () => fetchJourneyChecklist(locale),
            staleTime: 10 * 60 * 1000,
          }),
          queryClient.fetchQuery({
            queryKey: JOURNEY_STATE_QUERY_KEY,
            queryFn: () => fetchJourneyState(userId),
            staleTime: 60 * 1000,
          }),
        ]);
        const queue = buildAudiobookQueue(groupTopicsBySession(topics));
        queueRef.current = queue;
        const listened = new Set<number>(state?.completedSessionNumbers ?? []);
        const index = findStartIndex(queue, {
          topicId: opts.topicId,
          episode: opts.episode,
          listenedEpisodes: listened,
        });
        if (index < 0) {
          setLoading(false);
          setError('empty');
          return;
        }
        const saved = readPosition(userId);
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
    if (audio.paused) {
      unlockAudioElement(audio);
      const current = queueRef.current[indexRef.current];
      const loaded = current && audio.src === blobCache.current.get(`${locale}:${current.topicId}`);
      if (!loaded && indexRef.current >= 0) void playIndex(indexRef.current, position);
      else void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [getAudio, locale, playIndex, position]);

  const next = useCallback(() => {
    if (indexRef.current + 1 < queueRef.current.length) void playIndex(indexRef.current + 1);
  }, [playIndex]);

  const previous = useCallback(() => {
    const audio = getAudio();
    const target = previousIndex(indexRef.current, audio.currentTime);
    if (target === indexRef.current) audio.currentTime = 0;
    else void playIndex(target);
  }, [getAudio, playIndex]);

  const cycleRate = useCallback(() => {
    setRate((r) => {
      const n = nextRate(r);
      getAudio().playbackRate = n;
      writeValue(RATE_KEY, String(n));
      return n;
    });
  }, [getAudio]);

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
  }, [getAudio]);

  const close = useCallback(() => {
    const audio = getAudio();
    audio.pause();
    loadSeq.current++;
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    setSleepMinutes(0);
    setActive(false);
    setTrack(null);
    setEpisodeSummary(null);
    setError(null);
    setLoading(false);
  }, [getAudio]);

  const retry = useCallback(() => {
    if (indexRef.current >= 0) void playIndex(indexRef.current, position);
    else void start();
  }, [playIndex, position, start]);

  const dismissSummary = useCallback(() => setEpisodeSummary(null), []);

  // Lock screen / notification-shade controls.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (!track) {
      ms.metadata = null;
      return;
    }
    try {
      ms.metadata = new MediaMetadata({
        title: track.title,
        artist: 'Vitana',
        album: t('screens.audiobook.albumTitle', { n: track.episode }),
      });
      ms.setActionHandler('play', () => void getAudio().play().catch(() => {}));
      ms.setActionHandler('pause', () => getAudio().pause());
      ms.setActionHandler('nexttrack', () => next());
      ms.setActionHandler('previoustrack', () => previous());
      ms.setActionHandler('seekbackward', () => {
        const a = getAudio();
        a.currentTime = Math.max(0, a.currentTime - 15);
      });
      ms.setActionHandler('seekforward', () => {
        const a = getAudio();
        a.currentTime = Math.min(a.duration || a.currentTime + 15, a.currentTime + 15);
      });
    } catch {
      /* MediaMetadata unsupported — in-app controls still work */
    }
  }, [track, getAudio, next, previous]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : active ? 'paused' : 'none';
    }
  }, [playing, active]);

  // Signing out stops playback and drops rendered audio.
  useEffect(() => {
    if (!userId && active) close();
  }, [userId, active, close]);

  useEffect(() => {
    const cache = blobCache.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
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
    [
      active, playing, loading, error, track, position, duration, rate, sleepMinutes,
      episodeSummary, finished, start, toggle, next, previous, cycleRate, cycleSleep,
      askVitana, dismissSummary, retry, close,
    ],
  );

  return <AudiobookPlayerContext.Provider value={value}>{children}</AudiobookPlayerContext.Provider>;
}

/** The Audiobook player. Null outside the provider (e.g. isolated component tests). */
export function useAudiobookPlayer(): AudiobookPlayerApi | null {
  return useContext(AudiobookPlayerContext);
}
