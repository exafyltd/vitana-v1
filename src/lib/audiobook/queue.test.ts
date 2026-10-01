import { describe, expect, it } from 'vitest';
import {
  buildAudiobookQueue,
  findStartIndex,
  nextEpisodeIndex,
  nextRate,
  nextSleepTimer,
  previousIndex,
} from './queue';

const sessions = [
  {
    session: 1,
    chapterId: 'basics',
    topics: [
      { topicId: 'T251', displayLabel: 'Start', guidedPracticeTarget: null },
      { topicId: 'T252', displayLabel: 'Plan', guidedPracticeTarget: 'my_journey' },
    ],
  },
  {
    session: 2,
    chapterId: 'basics',
    topics: [{ topicId: 'T001', displayLabel: 'What Is Vitanaland', guidedPracticeTarget: null }],
  },
  {
    session: 3,
    chapterId: 'daily_use',
    topics: [
      { topicId: 'T002', displayLabel: 'Maxina', guidedPracticeTarget: 'community_overview' },
      { topicId: 'T003', displayLabel: 'ORB', guidedPracticeTarget: 'orb_overview' },
    ],
  },
];

describe('buildAudiobookQueue', () => {
  it('flattens episodes in order and marks each episode end', () => {
    const q = buildAudiobookQueue(sessions);
    expect(q.map((t) => t.topicId)).toEqual(['T251', 'T252', 'T001', 'T002', 'T003']);
    expect(q.map((t) => t.episode)).toEqual([1, 1, 2, 3, 3]);
    expect(q.map((t) => t.endsEpisode)).toEqual([false, true, true, false, true]);
    expect(q[1].practiceTarget).toBe('my_journey');
  });
});

describe('findStartIndex', () => {
  const q = buildAudiobookQueue(sessions);
  it('starts at a requested topic', () => {
    expect(findStartIndex(q, { topicId: 'T002' })).toBe(3);
  });
  it('starts at a requested episode', () => {
    expect(findStartIndex(q, { episode: 2 })).toBe(2);
  });
  it('resumes at the first episode not yet listened to', () => {
    expect(findStartIndex(q, { listenedEpisodes: new Set([1]) })).toBe(2);
    expect(findStartIndex(q, { listenedEpisodes: new Set([1, 2]) })).toBe(3);
  });
  it('starts from the beginning when nothing or everything was heard', () => {
    expect(findStartIndex(q)).toBe(0);
    expect(findStartIndex(q, { listenedEpisodes: new Set([1, 2, 3]) })).toBe(0);
  });
  it('ignores an unknown topic and falls through', () => {
    expect(findStartIndex(q, { topicId: 'T999', listenedEpisodes: new Set([1]) })).toBe(2);
  });
  it('is -1 for an empty queue', () => {
    expect(findStartIndex([])).toBe(-1);
  });
});

describe('navigation helpers', () => {
  const q = buildAudiobookQueue(sessions);
  it('nextEpisodeIndex jumps to the next episode', () => {
    expect(nextEpisodeIndex(q, 0)).toBe(2);
    expect(nextEpisodeIndex(q, 2)).toBe(3);
    expect(nextEpisodeIndex(q, 4)).toBe(-1);
  });
  it('previousIndex restarts the track after 3 seconds, else steps back', () => {
    expect(previousIndex(3, 10)).toBe(3);
    expect(previousIndex(3, 1)).toBe(2);
    expect(previousIndex(0, 1)).toBe(0);
  });
  it('rates and sleep timer cycle', () => {
    expect(nextRate(1)).toBe(1.25);
    expect(nextRate(1.5)).toBe(1);
    expect(nextRate(2)).toBe(1);
    expect(nextSleepTimer(0)).toBe(15);
    expect(nextSleepTimer(60)).toBe(0);
  });
});

describe('seasons (VTID-04762)', () => {
  it('the Prolog is Season 0 and the chapters follow in order', async () => {
    const { AUDIOBOOK_SEASONS, seasonNumber } = await import('./queue');
    expect(AUDIOBOOK_SEASONS[0]).toBe('prolog');
    expect(seasonNumber('prolog')).toBe(0);
    expect(seasonNumber('basics')).toBe(1);
    expect(seasonNumber('discovery')).toBe(6);
    expect(seasonNumber('unknown')).toBe(-1);
  });
});
