/**
 * VTID-05418 — Find a Match on the Spotlight grid (contract SR-31): the top
 * match is the one Spotlight card with Say hello + View profile, six matches
 * sit beside it as `standard` cards, further matches form the compact row, and
 * fewer matches never produce invented tiles (SR-13 / D4).
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FindPartnerMatch } from '@/lib/intentApi';

vi.mock('@/lib/i18n-toast', () => {
  const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
  return { t, lookup: t, getI18nLocale: () => 'en-US', notify: vi.fn(), notifyError: vi.fn() };
});

import { FindMatchSpotlightBody } from './FindMatchSpotlightBody';
import { matchToVCard, canGreetMatch, isRedactedMatch } from '@/components/ui/vcard/adapters';

function match(i: number, over: Partial<FindPartnerMatch> = {}): FindPartnerMatch {
  return {
    match_id: `m${i}`,
    intent_a_id: 'mine',
    intent_b_id: `theirs${i}`,
    vitana_id_a: 'me',
    vitana_id_b: `member${i}`,
    external_target_kind: null,
    external_target_id: null,
    kind_pairing: 'activity_seek::activity_seek',
    score: 0.9 - i * 0.01,
    match_reasons: { location_fit: 0.9, time_fit: 0.5 },
    compass_aligned: false,
    state: 'new',
    created_at: '2026-10-31T00:00:00Z',
    partner_display_name: `Member ${i}`,
    partner_match_cover_url: `https://example.test/cover${i}.jpg`,
    source_intent_id: 'mine',
    source_category: 'dance.salsa',
    vertical: 'dance',
    ...over,
  };
}

const many = (n: number) => Array.from({ length: n }, (_, i) => match(i));

function renderBody(matches: FindPartnerMatch[], extra: Partial<Parameters<typeof FindMatchSpotlightBody>[0]> = {}) {
  const onSayHello = vi.fn();
  const onViewProfile = vi.fn();
  const view = render(
    <MemoryRouter>
      <FindMatchSpotlightBody
        matches={matches}
        loading={false}
        empty={<div data-testid="empty">empty</div>}
        onSayHello={onSayHello}
        onViewProfile={onViewProfile}
        {...extra}
      />
    </MemoryRouter>,
  );
  return { ...view, onSayHello, onViewProfile };
}

const grid = (c: HTMLElement) => c.querySelector('[data-spotlight-grid]') as HTMLElement;
const slot = (c: HTMLElement, name: string) => grid(c).querySelector(`[data-slot="${name}"]`) as HTMLElement | null;

describe('VTID-05418 FindMatchSpotlightBody', () => {
  it('8 matches: one labelled spotlight (top match), six standard tiles, one compact row card', () => {
    const { container } = renderBody(many(8));
    expect(grid(container)).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    const spot = slot(container, 'spotlight')!;
    expect(spot.querySelector('[data-vcard-size="spotlight"]')!.getAttribute('data-vcard-key')).toBe('m0');
    expect(spot.querySelector('[data-vcard-spotlight-label]')).not.toBeNull();
    expect(within(spot).getByText('Member 0')).toBeInTheDocument();
    expect(within(spot).getByText(/spotlight\.grid\.match\.topMatch/)).toBeInTheDocument();
    const tiles = slot(container, 'tiles')!.querySelectorAll('[data-vcard-size]');
    expect(tiles).toHaveLength(6);
    tiles.forEach((el) => expect(el.getAttribute('data-vcard-size')).toBe('standard'));
    expect([...tiles].map((el) => el.getAttribute('data-vcard-key'))).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    const row = slot(container, 'row')!;
    expect(within(row).getByText('spotlight.grid.match.morePeople')).toBeInTheDocument();
    const rowCards = row.querySelectorAll('[data-vcard-size]');
    expect(rowCards).toHaveLength(1);
    expect(rowCards[0].getAttribute('data-vcard-size')).toBe('compact');
    expect(rowCards[0].getAttribute('data-vcard-key')).toBe('m7');
  });

  it('3 matches: spotlight + 2 tiles, no invented tiles and no row', () => {
    const { container } = renderBody(many(3));
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(slot(container, 'tiles')!.querySelectorAll('[data-vcard-size="standard"]')).toHaveLength(2);
    expect(slot(container, 'row')).toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="compact"]')).toHaveLength(0);
  });

  it('0 matches: the page empty state, no grid and no spotlight card', () => {
    const { container } = renderBody([]);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(container.querySelector('[data-spotlight-grid]')).toBeNull();
    expect(container.querySelectorAll('[data-vcard-size]')).toHaveLength(0);
  });

  it('loading with no data: the grid skeleton in the same shape, no real card', () => {
    const { container } = renderBody([], { loading: true });
    expect(container.querySelector('[data-archetype-skeleton][data-skeleton-layout="spotlight-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-vcard-size="spotlight"]:not([data-vcard-skeleton])')).toBeNull();
    expect(screen.queryByTestId('empty')).toBeNull();
  });

  it('Say hello and View profile call the page handlers with the top match; a tile opens its own profile', () => {
    const matches = many(4);
    const { container, onSayHello, onViewProfile } = renderBody(matches);
    const spot = slot(container, 'spotlight')!;
    fireEvent.click(within(spot).getByRole('button', { name: 'spotlight.grid.match.sayHello' }));
    expect(onSayHello).toHaveBeenCalledWith(matches[0]);
    fireEvent.click(within(spot).getByRole('button', { name: 'spotlight.grid.match.viewProfile' }));
    expect(onViewProfile).toHaveBeenCalledWith(matches[0]);
    fireEvent.click(within(slot(container, 'tiles')!).getByRole('button', { name: 'Member 2' }));
    expect(onViewProfile).toHaveBeenLastCalledWith(matches[2]);
    expect(onSayHello).toHaveBeenCalledTimes(1);
  });

  it('Say hello is disabled while its call is in flight', () => {
    const { container } = renderBody(many(2), { busyMatchId: 'm0' });
    expect(within(slot(container, 'spotlight')!).getByRole('button', { name: 'spotlight.grid.match.sayHello' })).toBeDisabled();
  });

  it('an anonymous partner-seek top match: no name, no cover, no View profile; a mutual match: no Say hello', () => {
    const anon = match(0, { vitana_id_b: null, redacted: true, kind_pairing: 'partner_seek::partner_seek', partner_display_name: null });
    const a = renderBody([anon, match(1)]);
    const spotA = slot(a.container, 'spotlight')!;
    expect(within(spotA).getByText('screens.intents.anonymousMatch')).toBeInTheDocument();
    expect(within(spotA).queryByRole('button', { name: 'spotlight.grid.match.viewProfile' })).toBeNull();
    expect(spotA.querySelector('img')).toBeNull();
    a.unmount();

    const b = renderBody([match(0, { state: 'mutual_interest' }), match(1)]);
    const spotB = slot(b.container, 'spotlight')!;
    expect(within(spotB).queryByRole('button', { name: 'spotlight.grid.match.sayHello' })).toBeNull();
    expect(within(spotB).getByRole('button', { name: 'spotlight.grid.match.viewProfile' })).toBeInTheDocument();
  });

  it('uses logical properties only (RTL mirrors)', () => {
    const { container } = renderBody(many(8));
    const classes = [...container.querySelectorAll('[class]')].map((el) => el.getAttribute('class')!).join(' ');
    expect(classes).not.toMatch(/(^|\s)(ml|mr|pl|pr|left|right)-/);
  });
});

describe('VTID-05418 matchToVCard', () => {
  it('maps score, name, handle, cover, shared goals and the profile link', () => {
    const d = matchToVCard(match(3));
    expect(d.key).toBe('m3');
    expect(d.eyebrow).toBe('screens.community.scorepctMatch:87');
    expect(d.title).toBe('Member 3');
    expect(d.meta).toBe('@member3');
    expect(d.media).toEqual({ src: 'https://example.test/cover3.jpg', alt: 'Member 3' });
    expect(d.body).toBe('Near you · Around your time');
    expect(d.href).toBe('/u/member3');
  });

  it('falls back to a themed cover and the handle when the partner has no cover or name', () => {
    const d = matchToVCard(match(1, { partner_match_cover_url: null, partner_display_name: null }));
    expect(d.media?.src).toEqual(expect.any(String));
    expect(d.media?.src).not.toBe('');
    expect(d.title).toBe('@member1');
    expect(d.meta).toBeUndefined();
  });

  it('a redacted match is anonymous: no cover, no handle, no link', () => {
    const m = match(2, { vitana_id_b: null, redacted: true, partner_display_name: 'Hidden' });
    expect(isRedactedMatch(m)).toBe(true);
    const d = matchToVCard(m);
    expect(d.title).toBe('screens.intents.anonymousMatch');
    expect(d.media?.src).toBeNull();
    expect(d.meta).toBeUndefined();
    expect(d.href).toBeUndefined();
  });

  it('only open matches can be greeted', () => {
    expect(canGreetMatch(match(0))).toBe(true);
    expect(canGreetMatch(match(0, { state: 'responded_by_a' }))).toBe(true);
    ['mutual_interest', 'engaged', 'fulfilled', 'declined', 'closed'].forEach((state) =>
      expect(canGreetMatch(match(0, { state }))).toBe(false),
    );
  });
});
