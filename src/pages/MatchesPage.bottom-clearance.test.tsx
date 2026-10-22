/**
 * matches-scroll-end / matches-list-clearance — the phone "People who match
 * you" list must scroll until its last card sits fully above the fixed bottom
 * navigation bar and the Orb (owner report 2026-10-22: the last match stayed
 * hidden under them).
 *
 * The page scrolls with the document, and the bar (+ safe area) and the Orb
 * are `position: fixed` over its bottom edge. jsdom has no layout, so this
 * proves the contract that makes the scroll end late enough: the phone
 * wrapper carries bottom padding tied to the same `--appilix-bottom-nav-height`
 * variable the Orb uses, plus the safe-area inset, and resets it on `md`.
 * No network: data and the Spotlight switch are mocked; nothing is written.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header>{p.title}</header> }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
}));

const matches = { data: [] as unknown[], isLoading: false, isError: false };
vi.mock('@/hooks/useRealMatches', () => ({ useRealMatches: () => ({ ...matches, refetch: vi.fn() }) }));
vi.mock('@/hooks/useMarkMatchesViewed', () => ({ useMarkMatchesViewed: () => undefined }));
vi.mock('@/lib/matchReason', () => ({ localizeMatchReason: () => '' }));

import MatchesPage from './MatchesPage';

const NAMES = ['Ana', 'Bea', 'Cleo', 'Dora', 'Eva', 'Fina', 'Gala'];

beforeEach(() => {
  matches.data = NAMES.map((n, i) => ({
    user_id: `m${i}`,
    display_name: n,
    avatar_url: null,
    match_reason: null,
    location: null,
    compatibility_score: 90 - i,
  }));
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/me/matches']}>
      <MatchesPage />
    </MemoryRouter>,
  );
}

describe('MatchesPage (phone) — the last match clears the bottom bar and the Orb', () => {
  it('renders every match, the last one included', () => {
    renderPage();
    const rows = within(screen.getByTestId('matches-list')).getAllByRole('listitem');
    expect(rows).toHaveLength(NAMES.length);
    expect(within(rows[rows.length - 1]).getByText('Gala')).toBeInTheDocument();
  });

  it('pads the page bottom by the bottom-nav height + safe area, reset on md', () => {
    renderPage();
    const page = screen.getByTestId('matches-page');
    const classes = page.className.split(/\s+/);
    const pb = classes.find((c) => c.startsWith('pb-[calc('));
    expect(pb, 'phone wrapper needs a calc() bottom padding').toBeDefined();
    expect(pb).toContain('var(--appilix-bottom-nav-height,72px)');
    expect(pb).toContain('env(safe-area-inset-bottom,0px)');
    // Must exceed the bar alone: the Orb sticks out ~36px above it (plan: +90px).
    const extra = Number(pb!.match(/_\+_(\d+)px\)\]$/)?.[1] ?? 0);
    expect(extra).toBeGreaterThanOrEqual(90);
    expect(classes).toContain('md:pb-6');
    // The list sits inside the padded wrapper, so the padding is below its last card.
    expect(page).toContainElement(screen.getByTestId('matches-list'));
  });
});
