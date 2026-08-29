/**
 * VTID-03763 — auto-complete a guided-topic practice when teaching ends.
 *
 * Live-reported regression: tapping a My Journey guided-topic session had
 * Vitana switch to a generic "new day greeting" instead of teaching the
 * tapped topic, and even when teaching genuinely happened (VTID-03685/03746
 * era fixes), nothing ever marked the taught step Done — the user's own
 * words: "after it finishes the user sees Well done drawer... don't forget
 * marking listened step/session as done!"
 *
 * orb-widget.js (VTID-03762/VTID-03763) signals teaching-end — either the
 * model calling end_guided_topic_teaching, or the 5-minute client backstop
 * when it never does — via the onGuidedTopicTeachingEnd widget callback,
 * which useOrbVoiceWidget.ts relays as a window CustomEvent
 * (`vitana:guided-topic-teaching-complete`, `{detail:{topicId, reason}}`)
 * since the ORB overlay lives outside this component's tree. This file
 * verifies GuidedJourneyCatalog listens for that event and marks the topic
 * Done, mirroring the existing explicit "Mark as Done" button
 * (markPracticeDone) — same completePractice() call, same invalidate +
 * toast — for BOTH completion reasons identically.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invalidateQueries = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/autopilot' }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData: vi.fn() }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  notify: vi.fn(),
}));
vi.mock('@/lib/orbActivate', () => ({ activateOrb: vi.fn() }));

const completePractice = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/journeyPractice', () => ({
  completePractice: (...args: unknown[]) => completePractice(...args),
  practiceTargetAction: () => null,
  recordSessionListened: vi.fn().mockResolvedValue(false),
}));

const T019 = {
  topicId: 'T019',
  session: 14,
  position: 1,
  chapterId: 'basics',
  displayLabel: 'Vitana fragen',
  shortDescription: null,
  explanation: { whatItIs: null, userBenefit: null, whenToUse: null, tryThis: null },
  guidedPracticeTarget: 'ask_vitana',
  businessGate: null,
};

vi.mock('@/hooks/useJourneyChecklist', () => ({
  useJourneyChecklist: () => ({
    topics: [T019],
    sessions: [{ session: 14, chapterId: 'basics', topics: [T019] }],
    chapters: ['basics'],
    loading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useGuidedJourneyProgress', () => ({
  useGuidedJourneyProgress: () => ({
    completedSet: new Set<string>(),
    listenedSessionSet: new Set<number>(),
  }),
  markSessionListenedInJourneyState: vi.fn(),
  JOURNEY_STATE_QUERY_KEY: ['journey', 'state'],
}));

import { GuidedJourneyCatalog } from './GuidedJourneyCatalog';

function dispatchTeachingComplete(detail: { topicId: string | null; reason: string | null }) {
  window.dispatchEvent(new CustomEvent('vitana:guided-topic-teaching-complete', { detail }));
}

describe('GuidedJourneyCatalog — auto-completes practice on guided-topic teaching end (VTID-03763)', () => {
  beforeEach(() => {
    completePractice.mockClear();
    invalidateQueries.mockClear();
  });

  it('calls completePractice(topicId) when the model signals teaching end', async () => {
    render(<GuidedJourneyCatalog />);
    dispatchTeachingComplete({ topicId: 'T019', reason: 'model_tool_call' });
    await vi.waitFor(() => expect(completePractice).toHaveBeenCalledWith('T019'));
    await vi.waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['journey', 'state'] }));
  });

  it('calls completePractice(topicId) identically when the backstop timeout fires instead', async () => {
    render(<GuidedJourneyCatalog />);
    dispatchTeachingComplete({ topicId: 'T019', reason: 'backstop_timeout' });
    await vi.waitFor(() => expect(completePractice).toHaveBeenCalledWith('T019'));
    await vi.waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['journey', 'state'] }));
  });

  it('ignores the event when topicId is null (defensive fallback path — nothing to mark done)', async () => {
    render(<GuidedJourneyCatalog />);
    dispatchTeachingComplete({ topicId: null, reason: 'model_tool_call' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(completePractice).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('does not invalidate/toast when completePractice reports failure', async () => {
    completePractice.mockResolvedValueOnce(false);
    render(<GuidedJourneyCatalog />);
    dispatchTeachingComplete({ topicId: 'T019', reason: 'model_tool_call' });
    await vi.waitFor(() => expect(completePractice).toHaveBeenCalledWith('T019'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('removes its event listener on unmount (no leak across catalog remounts)', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<GuidedJourneyCatalog />);
    expect(addSpy).toHaveBeenCalledWith('vitana:guided-topic-teaching-complete', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('vitana:guided-topic-teaching-complete', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
