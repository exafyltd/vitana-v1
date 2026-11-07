/**
 * VTID-05521 — the five `/assistant` panels against the Supabase double and
 * the gateway fake: every control writes the web's `user_preferences` update
 * (asserted as the built write, filtered on the member), a toggle round-trips
 * (write → refetch → new state), a failed write rolls back with the web's
 * toast, the N2 range `Slider` drives the numeric columns, the voice preview
 * and the sample greeting go through the gateway / edge function with the
 * web's bodies, and the referrals tab reads and writes `/vaea/config`.
 */
import '../helpers/no-network';
import { mockParams, mockPlayed } from './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { VAEA_CONFIG, createAssistantSupabase, createGateway, renderAssistant, settleUntil } from './helpers';
import { AssistantScreen } from '../../src/screens/ai-assistants/AssistantScreen';
import { greetingSession } from '../../src/screens/ai-assistants/data/hooks';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { translate } from '../../src/i18n';

afterEach(() => {
  mockParams.current = {};
  mockPlayed.length = 0;
  __clearToastsForTests();
  greetingSession.clear();
});

const increment = (testID: string) => fireEvent(screen.getByTestId(`${testID}-thumb-0`), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
const choose = async (trigger: string, item: string) => {
  fireEvent.press(screen.getByTestId(trigger));
  fireEvent.press(await screen.findByTestId(item));
};
const updates = (sb: ReturnType<typeof createAssistantSupabase>) => sb.writes.filter((w) => w.kind === 'update' && w.table === 'user_preferences');
const lastUpdate = (sb: ReturnType<typeof createAssistantSupabase>) => updates(sb).at(-1);

async function open(tab: string, opts: Parameters<typeof createAssistantSupabase>[0] = {}, gateway?: ReturnType<typeof createGateway>) {
  mockParams.current = { tab };
  const sb = createAssistantSupabase(opts);
  const r = renderAssistant(<AssistantScreen />, { supabase: sb, gateway });
  await screen.findByTestId(`assistant-panel-${tab}`);
  return { sb, ...r };
}

describe('ai tab (AIModelSettingsPanel)', () => {
  it('model and response-length selects write their column for the member', async () => {
    const { sb } = await open('ai');
    await choose('assistant-ai-model-trigger', 'assistant-ai-model-claude-3');
    await waitFor(() => expect(lastUpdate(sb)).toEqual({ kind: 'update', table: 'user_preferences', values: { ai_model: 'claude-3' }, filters: [['user_id', 'u-1']] }));
    await choose('assistant-response-length-trigger', 'assistant-response-length-long');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ ai_response_length: 'long' }));
  });

  it('the creativity Slider (0..1 step 0.1) writes ai_temperature and shows the value', async () => {
    const { sb } = await open('ai');
    expect(screen.getByText('Kreativität: 0.7')).toBeTruthy();
    expect(screen.getByTestId('assistant-ai-temperature-thumb-0').props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0.7 });
    increment('assistant-ai-temperature');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ ai_temperature: 0.8 }));
    expect(await screen.findByText('Kreativität: 0.8')).toBeTruthy();
  });
});

describe('voice tab (VoiceSettingsPanel)', () => {
  it('speed / pitch / volume sliders use the web ranges and write their column', async () => {
    const { sb } = await open('voice');
    expect(screen.getByTestId('assistant-voice-speed-thumb-0').props.accessibilityValue).toEqual({ min: 0.5, max: 2, now: 1 });
    expect(screen.getByTestId('assistant-voice-volume-thumb-0').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 80 });
    increment('assistant-voice-speed');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ tts_speed: 1.1 }));
    increment('assistant-voice-pitch');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ tts_pitch: 1.1 }));
    increment('assistant-voice-volume');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ tts_volume: 85 }));
    expect(await screen.findByText('85 %')).toBeTruthy();
  });

  it('a language change goes through the member language (stt_language)', async () => {
    const { sb } = await open('voice');
    await choose('assistant-voice-language-trigger', 'assistant-voice-language-fr-FR');
    await waitFor(() => expect(lastUpdate(sb)).toEqual({ kind: 'update', table: 'user_preferences', values: { stt_language: 'fr-FR' }, filters: [['user_id', 'u-1']] }));
  });

  it('the app has no browser voice list: the web’s “no voices” item and hint', async () => {
    await open('voice');
    expect(screen.getByTestId('assistant-voice-hint')).toHaveTextContent('Keine Stimmen verfügbar für DE. Installiere eine Stimme in deinen Betriebssystem- oder Browser-Einstellungen.');
    fireEvent.press(screen.getByTestId('assistant-voice-trigger'));
    expect(await screen.findByTestId('assistant-voice-none')).toHaveTextContent('Keine Stimmen verfügbar');
  });

  it('preview with AI consent: POST /orb/tts with the catalog phrase in the chosen language, then plays it at the set volume', async () => {
    const gateway = createGateway({ 'POST /orb/tts': { ok: true, audio_b64: 'QUJD', mime: 'audio/mpeg' } });
    await open('voice', {}, gateway);
    fireEvent.press(screen.getByTestId('assistant-voice-preview'));
    await waitFor(() => expect(mockPlayed).toEqual([{ uri: 'data:audio/mpeg;base64,QUJD', volume: 0.8 }]));
    expect(gateway.writes()).toEqual([
      expect.objectContaining({ method: 'POST', path: '/orb/tts', body: { text: translate('de', 'aiAssistantsNative.voice.previewPhrase'), lang: 'de' } }),
    ]);
    expect(gateway.writes()[0].headers.authorization).toBe('Bearer token-u-1');
    expect(__toastsForTests()).toEqual([]);
  });

  it('the preview phrase follows stt_language, not the UI language', async () => {
    const gateway = createGateway({ 'POST /orb/tts': { ok: true, audio_b64: 'QUJD', mime: 'audio/mpeg' } });
    await open('voice', { prefs: { stt_language: 'es-ES' } }, gateway);
    fireEvent.press(screen.getByTestId('assistant-voice-preview'));
    await waitFor(() => expect(gateway.writes()[0]?.body).toEqual({ text: translate('es', 'aiAssistantsNative.voice.previewPhrase'), lang: 'es' }));
  });

  it('without AI consent nothing goes to the cloud; the preview-unavailable toast shows', async () => {
    const gateway = createGateway();
    await open('voice', { prefs: { ai_data_consent_given: false } }, gateway);
    fireEvent.press(screen.getByTestId('assistant-voice-preview'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['aiAssistantsNative.voice.previewUnavailable']));
    expect(gateway.calls.filter((c) => c.path === '/orb/tts')).toEqual([]);
    expect(mockPlayed).toEqual([]);
  });

  it('a language the gateway cannot serve (no audio) falls back to the toast', async () => {
    const gateway = createGateway({ 'POST /orb/tts': { __status: 422, __body: { ok: false, error: 'LANG_NOT_SUPPORTED' } } });
    await open('voice', { prefs: { stt_language: 'sr-RS' } }, gateway);
    fireEvent.press(screen.getByTestId('assistant-voice-preview'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['aiAssistantsNative.voice.previewUnavailable']));
    expect(gateway.writes()[0]?.body).toEqual({ text: translate('sr', 'aiAssistantsNative.voice.previewPhrase'), lang: 'sr' });
    expect(mockPlayed).toEqual([]);
  });
});

describe('autopilot tab (AutopilotSettingsPanel)', () => {
  it('the master switch round-trips: write → refetch → new state', async () => {
    const { sb } = await open('autopilot');
    const sw = () => screen.getByTestId('assistant-autopilot-enabled');
    expect(sw().props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(sw());
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ autopilot_enabled: false }));
    await waitFor(() => expect(sb.tables.user_preferences[0].autopilot_enabled).toBe(false));
    await waitFor(() => expect(sw().props.accessibilityState).toMatchObject({ checked: false }));
  });

  it('a category switch writes the whole autopilot_categories object', async () => {
    const { sb } = await open('autopilot');
    fireEvent.press(screen.getByTestId('assistant-autopilot-category-discovery'));
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ autopilot_categories: { health: true, community: true, discovery: true, memory: true } }));
  });

  it('max actions writes a whole number in 1..20 only; quiet hours write a valid HH:MM only', async () => {
    const { sb } = await open('autopilot');
    fireEvent.changeText(screen.getByTestId('assistant-autopilot-max-actions'), '25');
    fireEvent.changeText(screen.getByTestId('assistant-autopilot-max-actions'), '');
    expect(updates(sb)).toEqual([]);
    fireEvent.changeText(screen.getByTestId('assistant-autopilot-max-actions'), '12');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ autopilot_max_actions_per_day: 12 }));
    fireEvent.changeText(screen.getByTestId('assistant-autopilot-quiet-start'), '23:');
    fireEvent.changeText(screen.getByTestId('assistant-autopilot-quiet-start'), '23:30');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ autopilot_quiet_hours_start: '23:30' }));
    expect(updates(sb)).toHaveLength(2);
  });

  it('the priority filter select writes autopilot_priority_filter', async () => {
    const { sb } = await open('autopilot');
    await choose('assistant-autopilot-priority-trigger', 'assistant-autopilot-priority-high');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ autopilot_priority_filter: 'high' }));
  });

  it('a failed write rolls the switch back and shows the web toast', async () => {
    await open('autopilot', { failUpdate: true });
    fireEvent.press(screen.getByTestId('assistant-autopilot-enabled'));
    await waitFor(() => expect(__toastsForTests().map((x) => [x.titleKey, x.descKey])).toEqual([['toasts.hooks.errorUpdatingPreferences', 'aiAssistantsNative.toast.errorDetail']]));
    await waitFor(() => expect(screen.getByTestId('assistant-autopilot-enabled').props.accessibilityState).toMatchObject({ checked: true }));
  });
});

describe('proactive tab (ProactiveTalkingPanel)', () => {
  it('turning auto-greeting off writes it and hides frequency + message types', async () => {
    const { sb } = await open('proactive');
    expect(screen.getByTestId('assistant-proactive-message-types')).toBeTruthy();
    fireEvent.press(screen.getByTestId('assistant-proactive-auto-greeting'));
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ auto_greeting_enabled: false }));
    await settleUntil(() => expect(screen.queryByTestId('assistant-proactive-message-types')).toBeNull());
    expect(screen.queryByTestId('assistant-proactive-frequency-trigger')).toBeNull();
  });

  it('frequency select and message-type checkboxes write the web values', async () => {
    const { sb } = await open('proactive');
    await choose('assistant-proactive-frequency-trigger', 'assistant-proactive-frequency-daily');
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ greeting_frequency: 'daily' }));
    fireEvent.press(screen.getByTestId('assistant-proactive-type-wellness_check'));
    await waitFor(() => expect(lastUpdate(sb)?.values).toEqual({ greeting_message_types: ['time_greeting', 'motivational', 'wellness_check'] }));
  });

  it('the configuration block shows the derived language and generator types', async () => {
    await open('proactive', { prefs: { tts_voice: 'de-DE-Wavenet-A' } });
    const block = screen.getByTestId('assistant-proactive-config');
    expect(block).toHaveTextContent(/STT-Sprache: de-DE/);
    expect(block).toHaveTextContent(/TTS-Stimme: de-DE-Wavenet-A/);
    expect(block).toHaveTextContent(/Aus der Stimme extrahiert: de-DE/);
    expect(block).toHaveTextContent(/Erlaubte Nachrichtentypen: welcome, motivation/);
  });

  it('play sample greeting: the edge function composes it, the gateway speaks it, the last greeting shows', async () => {
    const gateway = createGateway({ 'POST /orb/tts': { ok: true, audio_b64: 'R1JU', mime: 'audio/mpeg' } });
    const { sb } = await open('proactive', {}, gateway);
    expect(screen.queryByTestId('assistant-proactive-last-greeting')).toBeNull();
    fireEvent.press(screen.getByTestId('assistant-proactive-play'));
    expect(await screen.findByTestId('assistant-proactive-last-greeting')).toHaveTextContent(/<model-greeting>/);
    expect(sb.invokes).toEqual([
      { name: 'generate-proactive-greeting', options: { headers: { Authorization: 'Bearer token-u-1' }, body: { user_id: 'u-1', override_language: 'de-DE' } } },
    ]);
    await waitFor(() => expect(gateway.writes().map((c) => c.body)).toEqual([{ text: '<model-greeting>', lang: 'de' }]));
    await waitFor(() => expect(mockPlayed).toHaveLength(1));
  });

  it('without AI consent the sample greeting is skipped (web manualGreeting)', async () => {
    const { sb } = await open('proactive', { prefs: { ai_data_consent_given: false } });
    fireEvent.press(screen.getByTestId('assistant-proactive-play'));
    await act(async () => undefined);
    expect(sb.invokes).toEqual([]);
  });

  it('reset session clears the greeted-this-session flag', async () => {
    greetingSession.set(true);
    await open('proactive');
    fireEvent.press(screen.getByTestId('assistant-proactive-reset'));
    expect(greetingSession.hasGreeted()).toBe(false);
  });
});

describe('referrals tab (VaeaConfigPanel over /vaea/config)', () => {
  it('loading spinner, then the switches from GET /vaea/config', async () => {
    mockParams.current = { tab: 'referrals' };
    let release: () => void = () => undefined;
    const answer = new Promise<unknown>((r) => (release = () => r({ ok: true, config: VAEA_CONFIG })));
    const gateway = createGateway({ 'GET /vaea/config': () => answer });
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase(), gateway });
    expect(await screen.findByTestId('assistant-referrals-loading')).toBeTruthy();
    await act(async () => release());
    expect(await screen.findByTestId('assistant-panel-referrals')).toBeTruthy();
    expect(screen.getByTestId('assistant-referrals-receive').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('assistant-referrals-money').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('assistant-referrals-money-description')).toHaveTextContent('Schalte zuerst „Empfehlungen geben“ ein.');
    expect(gateway.calls[0]).toMatchObject({ method: 'GET', path: '/vaea/config' });
  });

  it('a switch PUTs one field and shows the returned config', async () => {
    const gateway = createGateway({
      'GET /vaea/config': { ok: true, config: VAEA_CONFIG },
      'PUT /vaea/config': (body: Record<string, unknown>) => ({ ok: true, config: { ...VAEA_CONFIG, ...body } }),
    });
    await open('referrals', {}, gateway);
    fireEvent.press(screen.getByTestId('assistant-referrals-give'));
    await waitFor(() => expect(gateway.writes()).toEqual([expect.objectContaining({ method: 'PUT', path: '/vaea/config', body: { give_recommendations: true } })]));
    await waitFor(() => expect(screen.getByTestId('assistant-referrals-money').props.accessibilityState).toMatchObject({ disabled: false }));
  });

  it('disclosure and expertise save buttons appear once edited and PUT the field', async () => {
    const gateway = createGateway({
      'GET /vaea/config': { ok: true, config: VAEA_CONFIG },
      'PUT /vaea/config': (body: Record<string, unknown>) => ({ ok: true, config: { ...VAEA_CONFIG, ...body } }),
    });
    await open('referrals', {}, gateway);
    expect(screen.queryByTestId('assistant-referrals-disclosure-save')).toBeNull();
    fireEvent.changeText(screen.getByTestId('assistant-referrals-disclosure'), 'Partner link');
    fireEvent.press(screen.getByTestId('assistant-referrals-disclosure-save'));
    fireEvent.changeText(screen.getByTestId('assistant-referrals-expertise'), ' sleep , , supplements ');
    fireEvent.press(screen.getByTestId('assistant-referrals-expertise-save'));
    await waitFor(() =>
      expect(gateway.writes().map((c) => c.body)).toEqual([{ disclosure_text: 'Partner link' }, { expertise_zones: ['sleep', 'supplements'] }]),
    );
    await settleUntil(() => expect(screen.queryByTestId('assistant-referrals-expertise-save')).toBeNull());
  });

  it('a failed read shows the gateway error in the destructive card', async () => {
    mockParams.current = { tab: 'referrals' };
    const gateway = createGateway({ 'GET /vaea/config': { __status: 500, __body: { error: 'VAEA_UNAVAILABLE' } } });
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase(), gateway });
    expect(await screen.findByTestId('assistant-referrals-error')).toHaveTextContent('VAEA_UNAVAILABLE');
  });
});
