/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * `/autopilot/audiobook` route file and its cold-start resolution, the
 * app-wide mount, the parity row, the core queue rules through the port,
 * and i18n / RTL: the mini player and the reminder control render no
 * unresolved key in all 11 locales, Arabic mirrors the direction glyphs, the
 * lane files use no physical left/right and draw no hardcoded text, and every
 * catalog key the lane uses exists in all 11 shards.
 */
import '../helpers/no-network';
import { audio } from './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, configure, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text as RNText, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __setAudiobookOriginForTests, buildAudiobookQueue, findStartIndex, groupTopicsBySession, nextRate, nextSleepTimer, previousIndex } from '../../src/ports/audiobook';
import { LOCALES, translate } from '../../src/i18n';
import { UIProvider } from '../../src/ports/ui';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { AudiobookMiniPlayer } from '../../src/screens/audiobook/AudiobookMiniPlayer';
import { AudiobookReminderControl } from '../../src/screens/audiobook/AudiobookReminderControl';
import { useAudiobookPlayer } from '../../src/screens/audiobook/AudiobookPlayerProvider';
import { audiobookWrapper, baseRoutes, flush, topics, withStatus } from './helpers';

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(60_000);

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
  __setAudiobookOriginForTests(null);
});
beforeEach(async () => {
  audio.reset();
  await AsyncStorage.clear();
});

const files = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
const laneFiles = [...files(join(APP, 'src/screens/audiobook')), join(APP, 'app/(app)/autopilot/audiobook.tsx'), join(APP, 'src/ports/audiobook.tsx'), join(APP, 'src/ports/journey-dashboard.ts')];

describe('route', () => {
  it('app/(app)/autopilot/audiobook.tsx renders the deep-link screen', () => {
    const src = readFileSync(join(APP, 'app/(app)/autopilot/audiobook.tsx'), 'utf8');
    expect(src).toContain('src/screens/audiobook/AudiobookDeepLink');
    expect(src).toMatch(/export default function/);
  });

  it('cold start: /autopilot/audiobook resolves native (a push open or universal link lands on the route file)', () => {
    expect(NATIVE_ROUTES).toContain('/autopilot/audiobook');
    expect(resolveWebPath('/autopilot/audiobook')).toMatchObject({ kind: 'native', href: '/autopilot/audiobook' });
    expect(resolveWebPath('/autopilot/audiobook/')).toMatchObject({ kind: 'native' });
    expect(resolveWebPath('/autopilot?audiobook=play')).toMatchObject({ kind: 'native', href: '/autopilot?audiobook=play' });
  });

  it('the root layout mounts the player once around the router, inside the ORB provider', () => {
    const src = readFileSync(join(APP, 'app/_layout.tsx'), 'utf8');
    expect(src).toContain("import { AudiobookHost } from '../src/screens/audiobook/AudiobookHost'");
    expect(src.indexOf('<OrbProvider>')).toBeLessThan(src.indexOf('<AudiobookHost>'));
    expect(src.indexOf('<AudiobookHost>')).toBeLessThan(src.indexOf('<Stack'));
    expect(src.indexOf('</AudiobookHost>')).toBeLessThan(src.indexOf('<OrbOverlay />'));
  });

  it('the parity row is native', () => {
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; owner: string | null }> };
    expect(ledger.rows.find((r) => r.key === '/autopilot/audiobook')).toMatchObject({ status: 'native', owner: 'kiro' });
  });
});

describe('the queue rules through @vitana/core', () => {
  it('builds the queue in episode order and finds the start', () => {
    const queue = buildAudiobookQueue(groupTopicsBySession(topics));
    expect(queue.map((t) => [t.topicId, t.episode, t.endsEpisode])).toEqual([
      ['T001', 1, false],
      ['T002', 1, true],
      ['T003', 2, true],
    ]);
    expect(findStartIndex(queue, { listenedEpisodes: new Set([1]) })).toBe(2);
    expect(findStartIndex(queue, { topicId: 'T002' })).toBe(1);
    expect(findStartIndex([], {})).toBe(-1);
    expect([previousIndex(2, 4), previousIndex(2, 1), previousIndex(0, 0)]).toEqual([2, 1, 0]);
    expect([nextRate(1), nextRate(1.25), nextRate(1.5)]).toEqual([1.25, 1.5, 1]);
    expect([nextSleepTimer(0), nextSleepTimer(15), nextSleepTimer(60)]).toEqual([15, 30, 0]);
  });
});

/** A dotted catalog key that t() returned unresolved. */
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

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

function Harness({ routes }: { routes?: unknown }) {
  const player = useAudiobookPlayer();
  void routes;
  return (
    <>
      <Pressable testID="start" onPress={() => void player?.start()}>
        <RNText>start</RNText>
      </Pressable>
      <AudiobookMiniPlayer />
      <AudiobookReminderControl />
    </>
  );
}

const settle = async () => {
  await act(async () => {
    await flush();
    await flush();
  });
};

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: the mini player (playing, error) and the reminder control render no unresolved key', async (locale) => {
    for (const routes of [baseRoutes(), baseRoutes({ 'GET /journey/audiobook/topics/T001/audio': withStatus(404) })]) {
      audio.reset();
      const { wrapper } = audiobookWrapper(routes, { language: languageFromLocale(locale) });
      const r = render(<Harness />, { wrapper });
      await settle();
      await act(async () => fireEvent.press(screen.getByTestId('start')));
      await settle();
      if (routes['GET /journey/audiobook/topics/T001/audio']) {
        await act(async () => audio.emit({ isLoaded: false, error: 'x' }));
        await settle();
        expect(screen.getByText(translate(locale, 'screens.audiobook.unavailable'))).toBeTruthy();
      } else {
        await act(async () => audio.emit({ playing: true, currentTime: 3, duration: 60 }));
        expect(screen.getByText(translate(locale, 'screens.audiobook.askVitana'))).toBeTruthy();
      }
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
  });

  it('German formats the speed with the German decimal comma', async () => {
    const { wrapper } = audiobookWrapper(baseRoutes(), { language: 'de-DE' });
    render(<Harness />, { wrapper });
    await settle();
    await act(async () => fireEvent.press(screen.getByTestId('start')));
    await settle();
    await act(async () => fireEvent.press(screen.getByTestId('audiobook-speed')));
    expect(screen.getByText('1,25×')).toBeTruthy();
  });

  it('Arabic (RTL): the Arabic catalog, and previous / play / next mirror', async () => {
    const { wrapper } = audiobookWrapper(baseRoutes(), { language: 'ar-XA' });
    // The shell root gives the kit the language's direction (ShellRoot.tsx).
    render(
      <UIProvider colorScheme="light" direction="rtl">
        <Harness />
      </UIProvider>,
      { wrapper },
    );
    await settle();
    await act(async () => fireEvent.press(screen.getByTestId('start')));
    await settle();
    await act(async () => audio.emit({ playing: false, currentTime: 3, duration: 60 }));
    expect(screen.getByText(translate('ar', 'screens.audiobook.askVitana'))).toBeTruthy();
    for (const name of ['SkipBack', 'SkipForward', 'Play']) {
      expect(StyleSheet.flatten(screen.getByTestId(`audiobook-icon-${name}`, { includeHiddenElements: true }).props.style).transform).toEqual([{ scaleX: -1 }]);
    }
    expect(StyleSheet.flatten(screen.getByTestId('audiobook-icon-Moon', { includeHiddenElements: true }).props.style).transform).toBeUndefined();
  });

  it('every catalog key the lane uses exists in all 11 locales; the new keys are in all 11 shards with German placeholders', () => {
    const keys = new Set<string>();
    for (const f of laneFiles) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
    for (const m of readFileSync(join(APP, 'src/screens/audiobook/AudiobookReminderControl.tsx'), 'utf8').matchAll(/notify(?:Error)?\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(25);
    for (const l of LOCALES) for (const k of keys) expect({ l, k, ok: translate(l, k) !== k }).toEqual({ l, k, ok: true });
    const shard = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'journeyAutopilotNative.json'), 'utf8')).journeyAutopilotNative.audiobook as Record<string, string>;
    const de = shard('de');
    expect(Object.keys(de).sort()).toEqual(['rateValue', 'sleepShort']);
    for (const l of LOCALES) expect({ l, keys: Object.keys(shard(l)).sort() }).toEqual({ l, keys: Object.keys(de).sort() });
  });
});

describe('RTL-safe, catalog-only text', () => {
  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThanOrEqual(9);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right, and no hardcoded JSX text', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
    // Text between JSX tags is only an expression ({t(...)}, {time}), never a literal word.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code.match(/>\s*[A-Za-z][A-Za-z ,.!?']+\s*<\//g) ?? []).toEqual([]);
  });
});
