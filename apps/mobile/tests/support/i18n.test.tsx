/**
 * VTID-05432 — support / connectors i18n: the `supportNative` shard exists in
 * all 11 locales with the German key set; every tab of both screens renders in
 * every locale with no unresolved catalog key (incl. accessibility labels and
 * placeholders); Arabic renders with the RTL direction.
 */
import '../helpers/no-network';
import { mockParams } from './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { SupportScreen } from '../../src/screens/support/SupportScreen';
import { ConnectorsScreen } from '../../src/screens/support/ConnectorsScreen';
import { makeWrapper } from './helpers';

afterAll(() => __setSupabaseForTests(null));

const I18N = join(__dirname, '../../../../src/i18n');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;

function keys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function allStrings(root: ReactTestInstance): string[] {
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

const GATEWAY = {
  'GET /feedback/tickets/mine?limit=100': {
    tickets: [{ id: 't-1', ticket_number: 'FB-1', kind: 'bug', status: 'resolved', created_at: '2026-10-20T10:00:00Z', answer_md: 'Done.' }],
  },
  'GET /wearables/providers': { ok: true, providers: [] },
  'GET /integrations/ai-assistants/providers': { ok: true, providers: [] },
  'GET /social-accounts/connections': { connections: [] },
  'GET /connected-apps': { ok: true, apps: [] },
  'GET /vaea/channels': { ok: true, channels: [] },
};

describe('supportNative shard', () => {
  const de = keys(JSON.parse(readFileSync(join(I18N, 'de/supportNative.json'), 'utf8'))).sort();
  it.each([...LOCALES])('%s has the German key set and no empty value', (locale) => {
    const doc = JSON.parse(readFileSync(join(I18N, `${locale}/supportNative.json`), 'utf8'));
    expect(keys(doc).sort()).toEqual(de);
    const values = JSON.stringify(doc).match(/":"([^"]*)"/g) ?? [];
    expect(values.filter((v) => v === '":""')).toEqual([]);
  });
});

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);

  it.each(['contact', 'tickets', 'faqs', 'community'])('support ?tab=%s has no raw key', async (tab) => {
    mockParams.current = { tab };
    const { wrapper } = makeWrapper(GATEWAY, { language });
    render(<SupportScreen />, { wrapper });
    if (tab === 'tickets') await screen.findByTestId('member-ticket-t-1');
    const raw = allStrings(screen.root).filter((s) => RAW_KEY.test(s.trim()));
    expect(raw).toEqual([]);
  });

  it('connectors (all sections open) has no raw key', async () => {
    mockParams.current = {};
    const { wrapper } = makeWrapper(GATEWAY, { language });
    render(<ConnectorsScreen />, { wrapper });
    await screen.findByTestId('agent-empty');
    for (const id of ['shopping', 'ai', 'media', 'social', 'fitness', 'health', 'other']) {
      fireEvent.press(screen.getByTestId(`section-${id}-trigger`));
    }
    const raw = allStrings(screen.root).filter((s) => RAW_KEY.test(s.trim()));
    expect(raw).toEqual([]);
  });
});

function Direction() {
  const { rtl } = useI18n();
  return <Text testID="probe-direction">{rtl ? 'rtl' : 'ltr'}</Text>;
}

it('Arabic renders the screen in the RTL locale', () => {
  mockParams.current = {};
  const { wrapper } = makeWrapper(GATEWAY, { language: languageFromLocale('ar') });
  render(
    <>
      <Direction />
      <SupportScreen />
    </>,
    { wrapper },
  );
  expect(screen.getByTestId('probe-direction').props.children).toBe('rtl');
  expect(screen.getByText('🆘 دعم')).toBeTruthy();
});
