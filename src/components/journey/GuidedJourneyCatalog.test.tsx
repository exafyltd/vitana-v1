/**
 * Regression test for VTID-03679 — "both steps within that session marked
 * done... I didn't start the 2nd one, and it's wrong."
 *
 * Live report: tapping ONE topic ("Ask Vitana", T019) in a two-topic session
 * (session 14: T019 "Ask Vitana" + T020 "Open Screen") showed BOTH topics
 * with a green checkmark in the catalog list, even though the user never
 * engaged with the second one.
 *
 * Root cause: the per-topic `done` flag fell back to `sessionComplete` — the
 * COARSE, intentional "listened to ANY topic in this session" signal
 * (recordSessionListened / +2 Vitana Index / next-session CTA advancement).
 * completedSet (from completePractice()'s explicit per-topic "mark as done")
 * is the correct, and per useGuidedJourneyProgress's own docstring, SEPARATE
 * signal for the individual checkmark.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/autopilot' }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  notify: vi.fn(),
}));
vi.mock('@/lib/orbActivate', () => ({ activateOrb: vi.fn() }));
vi.mock('@/lib/journeyPractice', () => ({
  completePractice: vi.fn().mockResolvedValue(true),
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
const T020 = {
  ...T019,
  topicId: 'T020',
  position: 2,
  displayLabel: 'Bildschirm öffnen',
  guidedPracticeTarget: 'open_screen',
};

vi.mock('@/hooks/useJourneyChecklist', () => ({
  useJourneyChecklist: () => ({
    topics: [T019, T020],
    sessions: [{ session: 14, chapterId: 'basics', topics: [T019, T020] }],
    chapters: ['basics'],
    loading: false,
    error: null,
  }),
}));

// The session was "listened" (T019 was tapped) but only T019 has an explicit
// completedSet entry — T020 was never engaged with. This is exactly the state
// recordListenedSession() produces after tapping ONE topic in a session.
vi.mock('@/hooks/useGuidedJourneyProgress', () => ({
  useGuidedJourneyProgress: () => ({
    completedSet: new Set(['T019']),
    listenedSessionSet: new Set([14]),
  }),
  markSessionListenedInJourneyState: vi.fn(),
  JOURNEY_STATE_QUERY_KEY: ['journey', 'state'],
}));

import { GuidedJourneyCatalog } from './GuidedJourneyCatalog';

describe('GuidedJourneyCatalog — per-topic completion (VTID-03679)', () => {
  it('checks off only the topic actually completed, not every topic in a listened session', () => {
    render(<GuidedJourneyCatalog />);

    const t19Button = screen.getByText('Vitana fragen').closest('button');
    const t20Button = screen.getByText('Bildschirm öffnen').closest('button');
    expect(t19Button).toBeTruthy();
    expect(t20Button).toBeTruthy();

    // T019 is in completedSet → its icon is the emerald CheckCircle2.
    const t19Icon = t19Button!.querySelector('svg');
    expect(t19Icon?.getAttribute('class')).toContain('text-emerald-500');

    // T020 is NOT in completedSet, even though the session (14) is listened —
    // it must stay the neutral Circle, not inherit the session's checkmark.
    const t20Icon = t20Button!.querySelector('svg');
    expect(t20Icon?.getAttribute('class')).not.toContain('text-emerald-500');
    expect(t20Icon?.getAttribute('class')).toContain('text-muted-foreground/35');

    // Same story for the per-topic status pill (a second, independent render
    // site driven by the same `done` value): T019 reads "done", T020 reads
    // "ready" — not both "done".
    expect(t19Button!.textContent).toContain('screens.guidedCatalog.statusDone');
    expect(t20Button!.textContent).toContain('screens.guidedCatalog.statusReady');
    expect(t20Button!.textContent).not.toContain('screens.guidedCatalog.statusDone');
  });

  it('still shows the session header itself as complete (unaffected — deliberate coarse signal)', () => {
    render(<GuidedJourneyCatalog />);
    // Scoped to the session header row so it can't collide with the per-topic
    // "statusDone" pill also present once T019 is complete.
    const header = screen.getByText('screens.guidedCatalog.sessionN:{"n":14}');
    const headerRow = header.closest('button');
    expect(headerRow?.textContent).toContain('screens.guidedCatalog.statusDone');
  });
});
