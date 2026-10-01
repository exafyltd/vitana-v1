/**
 * VTID-04761 — Audiobook listening mode: the play queue.
 *
 * The Audiobook plays the guided curriculum in order as one continuous list
 * of tracks: every topic of episode 1, then every topic of episode 2, and so
 * on (an "episode" is a curriculum session). Pure functions only — the player
 * provider owns the audio element and network; this file decides WHAT plays.
 */

export interface AudiobookTrack {
  /** Curriculum topic id (T001 …) — the unit the gateway renders as MP3. */
  topicId: string;
  /** Episode number (curriculum session). */
  episode: number;
  /** Chapter id of the episode (basics, daily_use, …). */
  chapterId: string;
  /** Localized topic title for the player and the lock screen. */
  title: string;
  /** What the "Try it now" step on the episode summary opens. */
  practiceTarget: string | null;
  /** True for the last topic of its episode — playing past it finishes the episode. */
  endsEpisode: boolean;
}

interface QueueTopic {
  topicId: string;
  displayLabel: string;
  guidedPracticeTarget: string | null;
}

interface QueueSession {
  session: number;
  chapterId: string;
  topics: QueueTopic[];
}

/** Flatten the curriculum (already ordered by session, then position). */
export function buildAudiobookQueue(sessions: readonly QueueSession[]): AudiobookTrack[] {
  const tracks: AudiobookTrack[] = [];
  for (const s of sessions) {
    s.topics.forEach((t, i) => {
      tracks.push({
        topicId: t.topicId,
        episode: s.session,
        chapterId: s.chapterId,
        title: t.displayLabel,
        practiceTarget: t.guidedPracticeTarget ?? null,
        endsEpisode: i === s.topics.length - 1,
      });
    });
  }
  return tracks;
}

/**
 * Where playback starts.
 *   - a requested topic → that topic;
 *   - a requested episode → its first topic;
 *   - otherwise → the first topic of the first episode not yet listened to
 *     (the same "next session" the My Journey hero shows), or the very
 *     beginning once everything has been heard.
 * Returns -1 only for an empty queue.
 */
export function findStartIndex(
  queue: readonly AudiobookTrack[],
  opts: {
    topicId?: string | null;
    episode?: number | null;
    listenedEpisodes?: ReadonlySet<number>;
  } = {},
): number {
  if (queue.length === 0) return -1;
  if (opts.topicId) {
    const i = queue.findIndex((t) => t.topicId === opts.topicId);
    if (i >= 0) return i;
  }
  if (opts.episode != null) {
    const i = queue.findIndex((t) => t.episode === opts.episode);
    if (i >= 0) return i;
  }
  const listened = opts.listenedEpisodes;
  if (listened && listened.size > 0) {
    const i = queue.findIndex((t) => !listened.has(t.episode));
    return i >= 0 ? i : 0;
  }
  return 0;
}

/** First index of the episode after the one at `index`, or -1 at the end. */
export function nextEpisodeIndex(queue: readonly AudiobookTrack[], index: number): number {
  const current = queue[index];
  if (!current) return -1;
  for (let i = index + 1; i < queue.length; i++) {
    if (queue[i].episode !== current.episode) return i;
  }
  return -1;
}

/**
 * "Previous" on a player: restart the current track when more than a few
 * seconds in, otherwise step back one track (staying at 0 at the start).
 */
export function previousIndex(index: number, currentTimeSec: number): number {
  if (currentTimeSec > 3) return index;
  return Math.max(0, index - 1);
}

/** Playback speeds the speed button cycles through. */
export const AUDIOBOOK_RATES = [1, 1.25, 1.5] as const;
export type AudiobookRate = (typeof AUDIOBOOK_RATES)[number];

export function nextRate(rate: number): AudiobookRate {
  const i = AUDIOBOOK_RATES.indexOf(rate as AudiobookRate);
  return AUDIOBOOK_RATES[(i + 1) % AUDIOBOOK_RATES.length];
}

/** Sleep-timer options in minutes; 0 = off. */
export const SLEEP_TIMER_MINUTES = [0, 15, 30, 60] as const;
export type SleepTimerMinutes = (typeof SLEEP_TIMER_MINUTES)[number];

export function nextSleepTimer(minutes: number): SleepTimerMinutes {
  const i = SLEEP_TIMER_MINUTES.indexOf(minutes as SleepTimerMinutes);
  return SLEEP_TIMER_MINUTES[(i + 1) % SLEEP_TIMER_MINUTES.length];
}

/** Group a flat published topic list into ordered episodes (same rule as useJourneyChecklist). */
export function groupTopicsBySession<
  T extends { session: number; position: number; chapterId: string },
>(topics: readonly T[]): Array<{ session: number; chapterId: string; topics: T[] }> {
  const bySession = new Map<number, T[]>();
  for (const t of topics) {
    const arr = bySession.get(t.session) ?? [];
    arr.push(t);
    bySession.set(t.session, arr);
  }
  return Array.from(bySession.keys())
    .sort((a, b) => a - b)
    .map((s) => {
      const ts = bySession.get(s)!.slice().sort((a, b) => a.position - b.position);
      return { session: s, chapterId: ts[0]?.chapterId ?? '', topics: ts };
    });
}

/**
 * VTID-04762 — the Audiobook's seasons, in listening order: curriculum
 * chapters, with the Prolog as Season 0.
 */
export const AUDIOBOOK_SEASONS = ['prolog', 'basics', 'daily_use', 'community', 'health', 'intelligence', 'discovery'];

/** Season number of a chapter (Prolog = 0), or -1 for an unknown chapter. */
export function seasonNumber(chapterId: string): number {
  return AUDIOBOOK_SEASONS.indexOf(chapterId);
}
