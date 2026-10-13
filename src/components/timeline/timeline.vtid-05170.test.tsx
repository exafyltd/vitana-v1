/**
 * VTID-05170 — Life Timeline P4: the rebuilt Memory → Timeline.
 * The gateway client is mocked; React Query, the body, rows, spotlight and
 * detail sheet run for real.
 *  - The Vitana Index leads: five pillars, balance sentence, weakest-pillar action.
 *  - Influence: a number only when measured; otherwise "counts for <pillar>".
 *  - No raw JSON, no generic "Activity" / "View Details" (the old cryptic cards).
 *  - Pillar chips filter through the API; empty / error states; one detail sheet.
 *  - Source contract: ScreenFrame "collection" behind the Spotlight flag, manifest migrated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : `${k}§`),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock('@/hooks/useVitanaIndex', () => ({ pillarLabel: (p: string) => `P:${p}` }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

const api = {
  fetchTimelinePage: vi.fn(),
  fetchTimelineSpotlight: vi.fn(),
  fetchTimelineItem: vi.fn(),
  setTimelineHiddenFromAi: vi.fn(),
  deleteTimelineItem: vi.fn(),
};
vi.mock('@/lib/timeline-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/timeline-api')>()),
  fetchTimelinePage: (...a: unknown[]) => api.fetchTimelinePage(...a),
  fetchTimelineSpotlight: (...a: unknown[]) => api.fetchTimelineSpotlight(...a),
  fetchTimelineItem: (...a: unknown[]) => api.fetchTimelineItem(...a),
  setTimelineHiddenFromAi: (...a: unknown[]) => api.setTimelineHiddenFromAi(...a),
  deleteTimelineItem: (...a: unknown[]) => api.deleteTimelineItem(...a),
}));

import { TimelineBody } from './TimelineBody';

const now = new Date();
const iso = (h: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0).toISOString();
const today = iso(12).slice(0, 10);

const SPOTLIGHT = {
  score_total: 306,
  tier: 'building',
  change_today: 6,
  change_7d: 26,
  pillars: {
    nutrition: { score: 62, change_today: 0, momentum: 'steady' },
    hydration: { score: 52, change_today: 6, momentum: 'rising' },
    exercise: { score: 60, change_today: 0, momentum: 'steady' },
    sleep: { score: 54, change_today: 0, momentum: 'slipping' },
    mental: { score: 60, change_today: 0, momentum: 'steady' },
  },
  balance: { factor: 0.9, penalty_pct: 10, reason_key: 'timeline.balance.held_back', weakest_pillar: 'hydration' },
  weakest_pillar: 'hydration',
  strongest_pillar: 'nutrition',
  top_contributors: [],
  last_computed: today,
};

const water = {
  kind: 'moment', id: '11111111-1111-1111-1111-111111111111', at: iso(9), tier: 'moment', activity_type: 'health.log.water',
  pillar: 'hydration', secondary_pillar: null, category: 'hydration', topic: 'water_logged', icon: 'Droplets', sensitivity: 'standard',
  summary: { key: 'timeline.summary.health_log_water', params: { via: 'voice', amount_ml: 500 } },
  influence: { kind: 'measured', delta_total: 6, delta_pillars: { hydration: 6 }, movement_id: 'm1' }, hidden_from_ai: false,
};
const group = {
  ...water, id: '22222222-2222-2222-2222-222222222222', at: iso(8), activity_type: 'community.group.join', pillar: null,
  secondary_pillar: 'mental', category: 'community', topic: 'group_joined', icon: 'UserPlus',
  summary: { key: 'timeline.summary.community_group_join', params: {} }, influence: { kind: 'counted', pillar: 'mental' },
};
const indexDay = { kind: 'index_day', id: `index-day:${today}`, date: today, delta_total: 6, score_total_after: 306, delta_pillars: { hydration: 6 }, top_pillar: 'hydration', movements: 1, daily_update: false };

function renderBody() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TimelineBody />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.fetchTimelineSpotlight.mockResolvedValue(SPOTLIGHT);
  api.fetchTimelinePage.mockResolvedValue({ items: [indexDay, water, group], next_cursor: null });
});

describe('VTID-05170 timeline body', () => {
  it('leads with the Vitana Index: five pillars, the balance sentence and the weakest-pillar action', async () => {
    renderBody();
    const card = await screen.findByTestId('timeline-index-spotlight');
    for (const p of ['nutrition', 'hydration', 'exercise', 'sleep', 'mental']) {
      expect(within(card).getByTestId(`timeline-pillar-${p}`)).toBeTruthy();
    }
    expect(card.textContent).toContain('306');
    expect(card.textContent).toContain('timeline.balance.held_back{"pillar":"P:hydration","pct":"10"}');
    expect(within(card).getByTestId('timeline-weakest-action').getAttribute('href')).toBe('/health/vitana-index');
  });

  it('shows measured influence only from the gateway, otherwise what it counted toward; never raw JSON or generic cards', async () => {
    renderBody();
    const rows = await screen.findAllByTestId('timeline-moment');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByTestId('timeline-influence-measured').textContent).toContain('timeline.influence.measured{"delta":"\u2066+6\u2069","pillar":"P:hydration"}');
    expect(rows[0].textContent).toContain('timeline.topic.water_logged');
    expect(rows[0].textContent).toContain('timeline.unit.ml');
    expect(within(rows[1]).getByTestId('timeline-influence-counted').textContent).toContain('timeline.influence.counted{"pillar":"P:mental"}');
    expect(screen.getByTestId('timeline-index-day').textContent).toContain('timeline.indexDay.rose');
    const body = screen.getByTestId('timeline-body').textContent ?? '';
    expect(body).not.toMatch(/View Details|"source"|life_compass_alignment|\{"status"/);
  });

  it('pillar chips filter through the API', async () => {
    renderBody();
    await screen.findAllByTestId('timeline-moment');
    fireEvent.click(screen.getByRole('button', { name: /P:sleep/ }));
    await waitFor(() => expect(api.fetchTimelinePage).toHaveBeenLastCalledWith(expect.objectContaining({ pillar: 'sleep' }), null));
  });

  it('opens one readable detail with before → after and the learning switch', async () => {
    api.fetchTimelineItem.mockResolvedValue({
      item: water,
      detail: { index_before: { hydration: 46 }, index_after: { hydration: 52 }, used_by_vitana: true, why_kept_key: 'timeline.why_kept.moment' },
    });
    renderBody();
    const rows = await screen.findAllByTestId('timeline-moment');
    await act(async () => { fireEvent.click(rows[0]); });
    const measured = await screen.findByTestId('timeline-detail-measured');
    expect(measured.textContent).toContain('timeline.detail.beforeAfter{"before":"46","after":"52","delta":"\u2066+6\u2069"}');
    fireEvent.click(screen.getByTestId('timeline-learn-switch'));
    await waitFor(() => expect(api.setTimelineHiddenFromAi).toHaveBeenCalledWith(water.id, true));
  });

  it('empty and error states', async () => {
    api.fetchTimelinePage.mockResolvedValueOnce({ items: [], next_cursor: null });
    const { unmount } = renderBody();
    expect(await screen.findByTestId('timeline-empty')).toBeTruthy();
    unmount();
    api.fetchTimelinePage.mockRejectedValueOnce(new Error('boom'));
    renderBody();
    expect(await screen.findByTestId('timeline-error')).toBeTruthy();
  });

  it('no Index yet → an honest prompt instead of numbers', async () => {
    api.fetchTimelineSpotlight.mockResolvedValue(null);
    renderBody();
    expect(await screen.findByTestId('timeline-no-index')).toBeTruthy();
  });
});

describe('VTID-05170 source contract', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../pages/memory/Timeline.tsx'), 'utf8');
  it('ScreenFrame "collection" behind the Spotlight flag; the old hooks and cards are gone', () => {
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).toMatch(/if \(spotlight/);
    expect(src).toContain('<ScreenFrame');
    expect(src).toContain('archetype="collection"');
    expect(src).not.toMatch(/useActivityHistory|HorizontalCardList|@\/components\/ui\/card|JSON\.stringify/);
  });
  it('manifest marks /memory/timeline migrated', () => {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../../design/screen-manifest.json'), 'utf8'));
    expect(m.screens.find((s: { path: string }) => s.path === '/memory/timeline')).toMatchObject({ archetype: 'collection', status: 'migrated' });
  });
  it('every catalog topic the gateway can send has a German and an English sentence', () => {
    const de = JSON.parse(fs.readFileSync(path.join(__dirname, '../../i18n/de/timeline.json'), 'utf8')).timeline;
    const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../../i18n/en/timeline.json'), 'utf8')).timeline;
    expect(Object.keys(de.topic).length).toBeGreaterThanOrEqual(80);
    // `_pending_review` is translation-review metadata the i18n bot adds, not a topic.
    const topics = (o: Record<string, unknown>) => Object.keys(o).filter((k) => !k.startsWith("_")).sort();
    expect(topics(en.topic)).toEqual(topics(de.topic));
    for (const v of Object.values(de.topic) as string[]) expect(v).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
  });
});
