/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — `/ai/companion`: the AI
 * coach chat over the fake `POST /conversation/turn` (a fake chat thread,
 * the built request body, the thread id carried on the next turn, a send
 * error → the web's toast), the AI-consent gate (no consent → the sheet;
 * "I agree" → the `user_preferences` update), the quick actions, the
 * sidebar widgets (Index mini 742 / tier label, Autopilot widget on / off)
 * and the onboarding completion on open (the two built autopilot requests
 * and the toast).
 */
import '../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { createCoachGateway, createCoachSupabase, renderCoach } from './helpers';
import { CompanionScreen } from '../../src/screens/ai-coach/CompanionScreen';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { chat } from '../../src/ports/ai-coach';
import { BIG_LIFT_STORAGE_KEY, completionToast } from '../../src/screens/ai-coach/data/celebrate';
import { __resetAutopilotRefsForTests } from '../../src/screens/ai-coach/data/gateway';
import { AI_CONSENT_KEY } from '../../src/screens/ai-coach/data/hooks';

const consented = (extra: Record<string, unknown> = {}) => createCoachSupabase({ tables: { user_preferences: [{ user_id: 'u-1', ai_data_consent_given: true, autopilot_enabled: true, ...extra }] } });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

async function type(text: string) {
  fireEvent.changeText(screen.getByTestId('health-coach-input'), text);
  await act(async () => {
    fireEvent.press(screen.getByTestId('health-coach-send'));
  });
}

describe('/ai/companion — coach chat', () => {
  it('renders a fake chat thread and sends the web request body', async () => {
    let n = 0;
    const gateway = createCoachGateway({ 'POST /conversation/turn': () => ({ ok: true, reply: `Reply ${++n}`, thread_id: 'th-1' }) });
    renderCoach(<CompanionScreen />, { gateway, supabase: consented(), language: 'en-US' });
    await screen.findByTestId('card-autopilot-widget-state');
    await waitFor(() => expect(screen.getByTestId('card-autopilot-widget-state')).toHaveTextContent('Active'));
    await type('How did I sleep?');
    expect(await screen.findByText('Reply 1')).toBeTruthy();
    expect(screen.getByTestId('health-coach-turn-user')).toHaveTextContent('How did I sleep?');
    const first = gateway.calls.find((c) => c.method === 'POST' && c.path === '/conversation/turn');
    expect(first?.headers).toMatchObject({ 'X-Vitana-Active-Role': 'community', 'Content-Type': 'application/json' });
    expect(first?.body).toEqual({
      channel: 'orb',
      user_id: 'u-1',
      lang: 'en',
      tenant_id: 't-maxina',
      message: { type: 'text', text: 'How did I sleep?' },
      ui_context: { surface: 'orb', screen: 'health_coach' },
    });
    await type('And today?');
    expect(await screen.findByText('Reply 2')).toBeTruthy();
    const turns = gateway.calls.filter((c) => c.path === '/conversation/turn');
    expect((turns[1].body as { thread_id?: string }).thread_id).toBe('th-1');
    expect(screen.getAllByTestId('health-coach-turn-assistant')).toHaveLength(2);
  });

  it('a failed reply shows the web toast and keeps the member turn (send error)', async () => {
    const gateway = createCoachGateway({ 'POST /conversation/turn': { __status: 502, __body: { ok: false, error: 'upstream' } } });
    renderCoach(<CompanionScreen />, { gateway, supabase: consented(), language: 'en-US' });
    await screen.findByTestId('card-autopilot-widget-state');
    await waitFor(() => expect(screen.getByTestId('card-autopilot-widget-state')).toHaveTextContent('Active'));
    await type('Hello');
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('screens.health.coachReplyFailed'));
    expect(screen.getByTestId('health-coach-turn-user')).toHaveTextContent('Hello');
    expect(screen.queryByTestId('health-coach-turn-assistant')).toBeNull();
    expect(screen.queryByTestId('health-coach-typing')).toBeNull();
  });

  it('an empty message sends nothing; a quick action fills the input', async () => {
    const gateway = createCoachGateway();
    renderCoach(<CompanionScreen />, { gateway, supabase: consented(), language: 'en-US' });
    await type('   ');
    expect(gateway.calls.filter((c) => c.path === '/conversation/turn')).toHaveLength(0);
    fireEvent.press(screen.getByTestId('health-coach-quick-0'));
    expect(screen.getByTestId('health-coach-input').props.value).toBe('Log my symptoms');
  });

  it('without AI consent the sheet opens; "I agree" saves consent and the next send goes out', async () => {
    const gateway = createCoachGateway({ 'POST /conversation/turn': { ok: true, reply: 'Hi there' } });
    const supabase = createCoachSupabase({ tables: { user_preferences: [{ user_id: 'u-1', ai_data_consent_given: false }] } });
    renderCoach(<CompanionScreen />, { gateway, supabase, language: 'en-US' });
    await waitFor(() => expect(supabase.reads.some((r) => r.table === 'user_preferences')).toBe(true));
    await type('Hello');
    expect(await screen.findByTestId('coach-consent')).toBeTruthy();
    expect(gateway.calls.filter((c) => c.path === '/conversation/turn')).toHaveLength(0);
    await act(async () => {
      fireEvent.press(screen.getByTestId('coach-consent-agree'));
    });
    await waitFor(() => expect(supabase.writes.find((w) => w.table === 'user_preferences')).toBeTruthy());
    const write = supabase.writes.find((w) => w.table === 'user_preferences');
    expect(write).toMatchObject({ kind: 'update', values: { ai_data_consent_given: true, ai_data_consent_date: expect.any(String) }, filters: [['eq', 'user_id', 'u-1']] });
    expect(await AsyncStorage.getItem(AI_CONSENT_KEY)).toBe('true');
    await type('Hello');
    expect(await screen.findByText('Hi there')).toBeTruthy();
  });

  it('creates the default preferences row when the member has none (web useUserPreferences)', async () => {
    const supabase = createCoachSupabase();
    renderCoach(<CompanionScreen />, { supabase, language: 'en-US' });
    await waitFor(() => expect(supabase.writes.find((w) => w.kind === 'insert' && w.table === 'user_preferences')).toBeTruthy());
    expect(supabase.writes.find((w) => w.kind === 'insert')?.values).toEqual({ user_id: 'u-1' });
  });
});

describe('/ai/companion — cards', () => {
  it('renders the sidebar and the card stack (loaded)', async () => {
    renderCoach(<CompanionScreen />, { supabase: consented(), language: 'en-US' });
    expect(screen.getByText('AI Companion ✨')).toBeTruthy();
    // Index mini: the page's 742 → the "Really good" tier, trend up.
    await waitFor(() => expect(screen.getByTestId('card-vitana-index-mini-score')).toHaveTextContent('742'));
    expect(screen.getByTestId('card-vitana-index-mini-tier')).toHaveTextContent('Really good');
    expect(within(screen.getByTestId('card-companion-suggestions')).getAllByTestId('card-companion-suggestions-item')).toHaveLength(4);
    expect(within(screen.getByTestId('card-companion-suggestions')).getAllByText('AI-generated wellness suggestion')).toHaveLength(4);
    // Autopilot widget: enabled → Active and the two suggestions.
    await waitFor(() => expect(screen.getByText('Schedule meditation break')).toBeTruthy());
    expect(screen.getAllByTestId('autopilot-log-entry')).toHaveLength(chat.autopilotLog.length);
    const recall = within(screen.getByTestId('card-memory-recall'));
    expect(recall.getAllByTestId('card-memory-recall-item')).toHaveLength(5);
    expect(recall.getAllByText('Recall')).toHaveLength(5);
    expect(within(screen.getByTestId('card-storytelling')).getAllByTestId('card-storytelling-item')).toHaveLength(2);
    for (const id of ['card-progress-streaks', 'card-smart-calendar', 'card-lifestyle-nutrition', 'card-motivation']) expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByTestId('card-motivation-quote')).toHaveTextContent('"Every small step towards wellness is a victory worth celebrating."');
  });

  it('the Autopilot widget is paused with the enable hint when autopilot is off (empty)', async () => {
    renderCoach(<CompanionScreen />, { supabase: consented({ autopilot_enabled: false }), language: 'en-US' });
    await waitFor(() => expect(screen.getByTestId('card-autopilot-widget-state')).toHaveTextContent('Paused'));
    expect(screen.getByTestId('card-autopilot-widget-empty')).toHaveTextContent('Activate Autopilot to see suggestions');
    expect(screen.queryByText('Schedule meditation break')).toBeNull();
    fireEvent.press(screen.getByTestId('card-autopilot-widget-settings'));
    expect(router.navigate).toHaveBeenLastCalledWith('/settings/autopilot');
  });
});

describe('/ai/companion — onboarding completion on open', () => {
  it('completes the open onboarding_maxina recommendation once and toasts the reward', async () => {
    const gateway = createCoachGateway({
      'GET /autopilot/recommendations': { recommendations: [{ id: 'r-9', source_ref: 'onboarding_maxina', status: 'pending', title: 'Meet Vitana' }, { id: 'r-1', source_ref: 'other', status: 'pending' }] },
      'POST /autopilot/recommendations/r-9/complete': { ok: true, reward: 5 },
    });
    const first = renderCoach(<CompanionScreen />, { gateway, supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('aiCoachNative.autopilotDone.reward'));
    const toast = __toastsForTests().find((t) => t.titleKey === 'aiCoachNative.autopilotDone.reward');
    expect(toast).toMatchObject({ kind: 'success', descKey: 'aiCoachNative.autopilotDone.task', params: { reward: 5, title: 'Meet Vitana' } });
    const posts = gateway.calls.filter((c) => c.method === 'POST' && c.path.startsWith('/autopilot'));
    expect(posts.map((c) => c.path)).toEqual(['/autopilot/recommendations/r-9/complete?role=community']);
    expect(gateway.calls.find((c) => c.path.startsWith('/autopilot/recommendations?'))?.path).toBe('/autopilot/recommendations?role=community');
    // Re-opening in the same session does not complete it again.
    first.unmount();
    renderCoach(<CompanionScreen />, { gateway, supabase: consented(), language: 'en-US' });
    await screen.findByTestId('screen-ai-companion');
    expect(gateway.calls.filter((c) => c.method === 'POST' && c.path.startsWith('/autopilot'))).toHaveLength(1);
  });

  it('formats an Index lift like the web celebrate (pillars, VTNA, predicted Index)', () => {
    const t = (k: string, p?: Record<string, string | number>) => `${k}${p ? JSON.stringify(p) : ''}`;
    const lift = completionToast({ title: 'x', reward: 3, vector: { sleep: 4, hydration: 6 } }, 400, t);
    expect(lift?.titleKey).toBe('aiCoachNative.lift.title');
    expect(lift?.params.lead).toBe('vitanaIndex.hydration +6, vitanaIndex.sleep +4');
    expect(lift?.params.total).toBe('aiCoachNative.lift.total{"n":410}');
    expect(lift?.descKey).toBe('aiCoachNative.lift.detail');
    const single = completionToast({ title: 'x', reward: undefined, vector: { mental: 2 } }, null, t);
    expect(single?.params).toMatchObject({ lead: '🧠 vitanaIndex.mental +2', vtna: '', total: '' });
    expect(completionToast({ title: 'x', reward: 0, vector: undefined }, null, t)).toBeNull();
  });
});

describe('/ai/companion — big-lift celebration (web celebrate.ts:287-296, confetti.ts:114-127)', () => {
  const liftGateway = (vector: Record<string, number>) =>
    createCoachGateway({
      'GET /autopilot/recommendations': { recommendations: [{ id: 'r-9', source_ref: 'onboarding_maxina', status: 'pending', title: 'Meet Vitana', contribution_vector: vector }] },
      'POST /autopilot/recommendations/r-9/complete': { ok: true, reward: 3 },
    });
  const kinds = () => __toastsForTests().map((t) => t.titleKey);
  let reduceMotion: jest.SpyInstance;

  beforeEach(() => {
    reduceMotion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => reduceMotion.mockRestore());

  it('magnitude 12: the lift toast, then the confetti overlay and the extra success toast', async () => {
    renderCoach(<CompanionScreen />, { gateway: liftGateway({ exercise: 7, sleep: 5 }), supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(kinds()).toEqual(['aiCoachNative.lift.title', 'toasts.common.success']));
    expect(__toastsForTests()[1]).toMatchObject({ kind: 'success', titleKey: 'toasts.common.success' });
    expect(await screen.findByTestId('ai-coach-confetti', { includeHiddenElements: true })).toBeTruthy();
    expect(Number(await AsyncStorage.getItem(BIG_LIFT_STORAGE_KEY))).toBeGreaterThan(0);
  });

  it('magnitude 5: only the lift toast, no confetti', async () => {
    renderCoach(<CompanionScreen />, { gateway: liftGateway({ exercise: 3, sleep: 2 }), supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(kinds()).toContain('aiCoachNative.lift.title'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(kinds()).toEqual(['aiCoachNative.lift.title']);
    expect(screen.queryByTestId('ai-coach-confetti', { includeHiddenElements: true })).toBeNull();
  });

  it('reduced motion on: no confetti and no extra toast', async () => {
    reduceMotion.mockResolvedValue(true);
    renderCoach(<CompanionScreen />, { gateway: liftGateway({ exercise: 7, sleep: 5 }), supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(kinds()).toContain('aiCoachNative.lift.title'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(kinds()).toEqual(['aiCoachNative.lift.title']);
    expect(screen.queryByTestId('ai-coach-confetti', { includeHiddenElements: true })).toBeNull();
    expect(await AsyncStorage.getItem(BIG_LIFT_STORAGE_KEY)).toBeNull();
  });

  it('a second big lift inside 5 minutes is throttled (stored timestamp)', async () => {
    const first = renderCoach(<CompanionScreen />, { gateway: liftGateway({ exercise: 7, sleep: 5 }), supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(kinds()).toEqual(['aiCoachNative.lift.title', 'toasts.common.success']));
    first.unmount();
    __resetAutopilotRefsForTests();
    __clearToastsForTests();
    renderCoach(<CompanionScreen />, { gateway: liftGateway({ mental: 15 }), supabase: consented(), language: 'en-US' });
    await waitFor(() => expect(kinds()).toContain('aiCoachNative.lift.title'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(kinds()).toEqual(['aiCoachNative.lift.title']);
    expect(screen.queryByTestId('ai-coach-confetti', { includeHiddenElements: true })).toBeNull();
  });
});
