/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — Talk to Vitana in all 11
 * locales: the whole screen (form, open topic list, success notice, card
 * strip with F1 / F2 / F3 and a server card, a resolved + a voice ticket)
 * renders with no unresolved catalog key, including accessibility labels and
 * placeholders; Arabic renders RTL; the lane's source uses logical start/end
 * only and draws no hardcoded user-visible text (every <Text> child is an
 * expression). The lane reuses existing catalog keys and adds no shard.
 */
import '../helpers/no-network';
import { mockParams } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { TalkToVitanaScreen } from '../../src/screens/ai-chat/TalkToVitanaScreen';
import { daysAgo, indexSupabase, makeWrapper } from './helpers';

jest.setTimeout(30000);
afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  mockParams.current = {};
  await AsyncStorage.clear();
});

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;

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

function gateway(locale: string) {
  return {
    'GET /feedback/tickets/mine?limit=100': {
      tickets: [
        { id: 't-1', ticket_number: 'FB-1', kind: 'bug', status: 'resolved', created_at: '2026-10-20T10:00:00Z', resolver_agent: 'devon', answer_md: 'Done.', structured_fields: { voice_origin: true, severity: 'low' } },
        { id: 't-2', ticket_number: 'FB-2', kind: 'mystery', status: 'user_confirmed', created_at: '2026-10-21T10:00:00Z' },
      ],
    },
    'POST /feedback/tickets': { id: 't-3', ticket_number: 'FB-3' },
    'GET /enrichment-cards?screen=talk-to-vitana': { ok: true, cards: [] },
    [`GET /journey-checklist?locale=${locale}`]: { ok: true, topics: [{ topicId: 'a', session: 1, position: 1 }, { topicId: 'b', session: 2, position: 1 }] },
    'GET /journey/state': { ok: true, state: { currentSession: 2 } },
  };
}

describe.each([...LOCALES])('%s', (locale) => {
  it('the whole screen has no raw catalog key', async () => {
    const supabase = indexSupabase([
      { user_id: 'u-self', date: daysAgo(4), score_total: 500 },
      { user_id: 'u-self', date: daysAgo(0), score_total: 420 },
    ]);
    const { wrapper } = makeWrapper(gateway(locale), { language: languageFromLocale(locale), supabase });
    render(<TalkToVitanaScreen />, { wrapper });
    await screen.findByTestId('talk-ticket-t-1');
    await screen.findByTestId('vitana-card-F1');
    await screen.findByTestId('vitana-card-F2');
    fireEvent.changeText(screen.getByTestId('talk-text'), 'x');
    fireEvent.press(screen.getByTestId('talk-send'));
    await screen.findByTestId('ticket-created');
    fireEvent.press(screen.getByTestId('talk-kind'));
    const raw = allStrings(screen.root).filter((s) => RAW_KEY.test(s.trim()));
    expect(raw).toEqual([]);
  });
});

function Direction() {
  const { rtl } = useI18n();
  return <Text testID="probe-direction">{rtl ? 'rtl' : 'ltr'}</Text>;
}

it('Arabic renders the screen in the RTL locale', async () => {
  const { wrapper } = makeWrapper(gateway('ar'), { language: languageFromLocale('ar') });
  render(
    <>
      <Direction />
      <TalkToVitanaScreen />
    </>,
    { wrapper },
  );
  expect(screen.getByTestId('probe-direction').props.children).toBe('rtl');
  expect(await screen.findByTestId('talk-ticket-t-1')).toBeTruthy();
});

const LANE = join(__dirname, '../../src/screens/ai-chat');
function laneFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? laneFiles(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}
const SOURCES = [...laneFiles(LANE), join(__dirname, '../../src/ports/ai-chat.tsx'), join(__dirname, '../../app/(app)/comm/talk-to-vitana.tsx')];

describe.each(SOURCES.map((f) => [f.split('/apps/mobile/')[1] ?? f, f]))('%s', (_name, file) => {
  const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('uses logical start/end, never physical left/right', () => {
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/['"](left|right)['"]/g) ?? []).toEqual([]);
  });

  it('draws no hardcoded text: <Text> children are expressions', () => {
    const literal = src.match(/<Text\b[^>]*>\s*[A-Za-z][^<{]*</g) ?? [];
    expect(literal).toEqual([]);
  });
});
