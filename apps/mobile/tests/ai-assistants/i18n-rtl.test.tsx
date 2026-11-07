/**
 * VTID-05521 — `/assistant` in all 11 locales without an unresolved catalog
 * key (every tab), the new `aiAssistantsNative` namespace complete in every
 * locale (DE is the source), the preview phrase present per locale, Arabic
 * rendered RTL with the Arabic catalog, and no physical left/right in the
 * lane's styles (logical start/end only).
 */
import '../helpers/no-network';
import { mockParams } from './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { createAssistantSupabase, createGateway, renderAssistant, VAEA_CONFIG } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { AssistantScreen } from '../../src/screens/ai-assistants/AssistantScreen';
import { AIAssistantConnectSheet } from '../../src/screens/ai-assistants/AIAssistantConnectSheet';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

// The 11-locale loops render every tab once per locale; under default workers
// that outruns Jest's 5 s default.
jest.setTimeout(30000);

afterEach(() => {
  mockParams.current = {};
});

function strings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

const TABS = ['voice', 'ai', 'autopilot', 'proactive', 'referrals'] as const;
const gateway = () => createGateway({ 'GET /vaea/config': { ok: true, config: VAEA_CONFIG } });

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);
  it.each(TABS)('/assistant?tab=%s has no raw key', async (tab) => {
    mockParams.current = { tab };
    renderAssistant(<AssistantScreen />, { supabase: createAssistantSupabase({ prefs: { stt_language: language } }), gateway: gateway(), language });
    await screen.findByTestId(`assistant-panel-${tab}`);
    expect(strings(screen.getByTestId('screen-assistant')).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
  });

  it('the connect sheet and its error have no raw key', async () => {
    renderAssistant(<AIAssistantConnectSheet open provider="claude" onClose={jest.fn()} />, { supabase: createAssistantSupabase({ prefs: { stt_language: language } }), language });
    fireEvent.changeText(await screen.findByTestId('ai-connect-key'), 'nope');
    fireEvent.press(screen.getByTestId('ai-connect-submit'));
    await screen.findByTestId('ai-connect-error');
    expect(strings(screen.getByTestId('ai-connect')).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
  });
});

describe('aiAssistantsNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'aiAssistantsNative.json'), 'utf8'));
  const de = keys(load('de')).sort();

  it.each([...LOCALES])('%s has exactly the German keys, none empty, placeholders kept', (l) => {
    const shard = load(l);
    expect(keys(shard).sort()).toEqual(de);
    const get = (o: Record<string, unknown>, k: string) => k.split('.').reduce<unknown>((v, p) => (v as Record<string, unknown>)[p], o) as string;
    for (const k of de) {
      const v = get(shard, k);
      expect(v.trim()).not.toBe('');
      expect((v.match(/\{\w+\}/g) ?? []).sort()).toEqual((get(load('de'), k).match(/\{\w+\}/g) ?? []).sort());
    }
  });

  it('German is du-form, Portuguese você, French tu, Russian ты (no formal register)', () => {
    const flat = (l: string) => JSON.stringify(load(l));
    expect(flat('de')).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
    expect(flat('pt')).not.toMatch(/\b(teu|tua|teus|tuas)\b/);
    expect(flat('fr')).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(flat('ru')).not.toMatch(/(^|[^А-Яа-яЁё])(вы|вас|ваш\S*|вам)([^А-Яа-яЁё]|$)/i);
  });
});

it('Arabic renders right-to-left with the Arabic catalog', async () => {
  let rtl: boolean | null = null;
  function Probe(): ReactElement {
    rtl = useI18n().rtl;
    return <AssistantScreen />;
  }
  renderAssistant(<Probe />, { supabase: createAssistantSupabase({ prefs: { stt_language: 'ar-XA' } }), language: 'ar-XA', direction: 'rtl' });
  expect(await screen.findByTestId('assistant-panel-voice')).toBeTruthy();
  expect(rtl).toBe(true);
  expect(screen.getByText('معاينة الصوت')).toBeTruthy();
});

it('no physical left/right in the ai-assistants lane styles (logical start/end only)', () => {
  const roots = [join(__dirname, '../../src/screens/ai-assistants'), join(__dirname, '../../app/(app)/assistant'), join(__dirname, '../../src/ports/assistant.tsx')];
  const offenders: string[] = [];
  const check = (full: string) => {
    const text = readFileSync(full, 'utf8');
    const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
    for (const m of text.matchAll(re)) offenders.push(`${full}: ${m[0]}`);
  };
  const walk = (p: string) => {
    if (!statSync(p).isDirectory()) return check(p);
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) check(full);
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});
