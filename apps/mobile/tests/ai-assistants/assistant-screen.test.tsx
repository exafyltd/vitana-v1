/**
 * VTID-05521 — `/assistant`: the `tab` search param selects each of the five
 * panels (default `voice` — the voice SETTINGS panel, not the ORB session), a
 * tab press writes the param back, the header + tab strip stay while the
 * preferences load, a failed read renders nothing (web `return null`), a
 * member without a row gets the default row inserted, and the route is a
 * concrete native route for all six ledger rows.
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { existsSync } from 'fs';
import { join } from 'path';
import { createAssistantSupabase, renderAssistant, settleUntil } from './helpers';
import { AssistantScreen, activeTab } from '../../src/screens/ai-assistants/AssistantScreen';
import AssistantRoute from '../../app/(app)/assistant/index';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';

afterEach(() => {
  mockParams.current = {};
  jest.clearAllMocks();
});

const PANELS = [
  ['voice', 'assistant-panel-voice'],
  ['ai', 'assistant-panel-ai'],
  ['autopilot', 'assistant-panel-autopilot'],
  ['proactive', 'assistant-panel-proactive'],
  ['referrals', 'assistant-panel-referrals'],
] as const;

describe('tab param → panel', () => {
  it('no tab opens the voice settings panel (web default)', async () => {
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase() });
    expect(await screen.findByTestId('assistant-panel-voice')).toBeTruthy();
    expect(screen.getByTestId('assistant-tab-voice').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByTestId('assistant-panel-ai')).toBeNull();
  });

  it.each(PANELS)('?tab=%s renders only its panel', async (tab, panel) => {
    mockParams.current = { tab };
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase() });
    expect(await screen.findByTestId(panel)).toBeTruthy();
    expect(screen.getByTestId(`assistant-tab-${tab}`).props.accessibilityState).toMatchObject({ selected: true });
    for (const [, other] of PANELS) if (other !== panel) expect(screen.queryByTestId(other)).toBeNull();
  });

  it('an unknown tab selects no panel, as on the web', async () => {
    mockParams.current = { tab: 'nope' };
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase() });
    await screen.findByTestId('assistant-tabs');
    await settleUntil(() => expect(screen.queryByTestId('assistant-loading')).toBeNull());
    for (const [, panel] of PANELS) expect(screen.queryByTestId(panel)).toBeNull();
  });

  it('pressing a tab writes ?tab= back (web setSearchParams)', async () => {
    const { rerender } = renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase() });
    await screen.findByTestId('assistant-panel-voice');
    fireEvent.press(screen.getByTestId('assistant-tab-autopilot'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'autopilot' });
    rerender(<AssistantScreen />);
    expect(await screen.findByTestId('assistant-panel-autopilot')).toBeTruthy();
  });

  it('activeTab mirrors searchParams.get("tab") || "voice"', () => {
    expect(activeTab(undefined)).toBe('voice');
    expect(activeTab('')).toBe('voice');
    expect(activeTab(['proactive', 'ai'])).toBe('proactive');
  });

  it('the tab strip shows the five mobile labels from the catalog', async () => {
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase() });
    await screen.findByTestId('assistant-panel-voice');
    expect(screen.getByTestId('assistant-tab-voice')).toHaveTextContent('Stimme');
    expect(screen.getByTestId('assistant-tab-ai')).toHaveTextContent('KI');
    expect(screen.getByTestId('assistant-tab-autopilot')).toHaveTextContent('Autopilot');
    expect(screen.getByTestId('assistant-tab-proactive')).toHaveTextContent('Proaktiv');
    expect(screen.getByTestId('assistant-tab-referrals')).toHaveTextContent('Empfehlungen');
    expect(screen.getByRole('header', { name: 'KI-Assistent' })).toBeTruthy();
  });
});

describe('loaded / empty / error', () => {
  it('loading keeps the header and tabs and shows the form skeleton in the pane', async () => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((r) => (release = r));
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase({ hold }) });
    expect(await screen.findByTestId('assistant-loading')).toBeTruthy();
    expect(screen.getByTestId('assistant-tabs')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'KI-Assistent' })).toBeTruthy();
    expect(screen.queryByTestId('assistant-panel-voice')).toBeNull();
    await act(async () => release());
    expect(await screen.findByTestId('assistant-panel-voice')).toBeTruthy();
    expect(screen.queryByTestId('assistant-loading')).toBeNull();
  });

  it('reads the member’s user_preferences row', async () => {
    const sb = createAssistantSupabase();
    renderAssistant(<AssistantScreen />, { supabase: sb });
    await screen.findByTestId('assistant-panel-voice');
    expect(sb.client.from).toHaveBeenCalledWith('user_preferences');
    expect(sb.writes).toEqual([]);
  });

  it('no row yet: inserts the default row for the member (web hook), then renders', async () => {
    const sb = createAssistantSupabase({ prefs: null });
    renderAssistant(<AssistantScreen />, { supabase: sb });
    expect(await screen.findByTestId('assistant-panel-voice')).toBeTruthy();
    expect(sb.writes).toEqual([{ kind: 'insert', table: 'user_preferences', values: { user_id: 'u-1' }, filters: [] }]);
  });

  it('a failed read renders nothing (web `if (!isLoading && !preferences) return null`)', async () => {
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase({ failRead: true }) });
    await settleUntil(() => expect(screen.queryByTestId('screen-assistant')).toBeNull());
  });
});

describe('route', () => {
  it('app/(app)/assistant/index.tsx renders the screen', async () => {
    renderAssistant(<AssistantRoute />, { supabase: createAssistantSupabase() });
    expect(await screen.findByTestId('screen-assistant')).toBeTruthy();
  });

  it('every /assistant ledger row resolves native, query kept', () => {
    expect(existsSync(join(__dirname, '../../app/(app)/assistant/index.tsx'))).toBe(true);
    expect(NATIVE_ROUTES).toContain('/assistant');
    for (const q of ['', '?tab=voice', '?tab=ai', '?tab=autopilot', '?tab=proactive', '?tab=referrals']) {
      const r = resolveWebPath(`/assistant${q}`);
      expect(r.kind).toBe('native');
      expect(r.href).toBe(`/assistant${q}`);
    }
  });
});
