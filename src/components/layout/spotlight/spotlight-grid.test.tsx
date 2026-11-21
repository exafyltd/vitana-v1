/**
 * VTID-05420 (spotlight-card-proportion/layout-core) — SpotlightGrid, contract
 * SR-31: one Spotlight card at ~40% (>=1280 px) / 50% (1024-1279 px) of the content width,
 * spanning the tile rows, a 3x2 grid of standard cards beside it and one
 * full-width compact row below. Tiles are never fabricated (D4), the spotlight
 * is never widened, and only logical properties are used (RTL).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));

import { SpotlightGrid } from './index';
import { VCard } from '@/components/ui/vcard';
import tailwindConfig from '../../../../tailwind.config';

const PHYSICAL = /(^|\s)-?(ml|mr|pl|pr|left|right)-|text-left|text-right|rounded-[lr](\s|-|$)/;

const tiles = (n: number) => Array.from({ length: n }, (_, i) => <VCard key={i} size="standard" title={`tile ${i}`} />);
const compacts = (n: number) => Array.from({ length: n }, (_, i) => <VCard key={i} size="compact" title={`next ${i}`} />);
const spot = <VCard size="spotlight" spotlightLabel title="The one" />;

function renderGrid(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function slots(container: HTMLElement) {
  const grid = container.querySelector('[data-spotlight-grid]') as HTMLElement;
  return {
    grid,
    spotlight: grid.querySelector(':scope > [data-slot="spotlight"]') as HTMLElement,
    tiles: grid.querySelector(':scope > [data-slot="tiles"]') as HTMLElement,
    row: grid.querySelector(':scope > [data-slot="row"]') as HTMLElement | null,
  };
}

describe('VTID-05420 SpotlightGrid', () => {
  it('renders 1 spotlight in its slot, 6 standard tiles and compact cards only in the row', () => {
    const { container } = renderGrid(
      <SpotlightGrid label="Your health" spotlight={spot} tiles={tiles(6)} row={{ title: 'Up next', items: compacts(5) }} />,
    );
    const s = slots(container);
    expect(s.spotlight.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    expect(s.tiles.querySelectorAll('[data-vcard-size="standard"]').length).toBe(6);
    expect(s.tiles.querySelectorAll('[data-vcard-size]:not([data-vcard-size="standard"])').length).toBe(0);
    expect(s.row!.querySelectorAll('[data-vcard-size="compact"]').length).toBe(5);
    expect(s.row!.querySelectorAll('[data-vcard-size]:not([data-vcard-size="compact"])').length).toBe(0);
    expect(screen.getByRole('heading', { name: 'Your health' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Up next' })).toBeInTheDocument();
  });

  it('places the spotlight at 2 of 5 columns at >=1280 px (lg:) / 2 of 4 at 1024-1279 px (md:), spanning the tile rows', () => {
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(6)} />);
    const s = slots(container);
    expect(s.grid.className).toContain('md:grid-cols-4');
    expect(s.grid.className).toContain('lg:grid-cols-5');
    expect(s.spotlight.className).toContain('md:col-span-2');
    expect(s.spotlight.className).toContain('lg:col-span-2');
    expect(s.spotlight.className).toContain('lg:row-span-2');
    expect(s.spotlight.className).toContain('md:row-span-3');
    expect(s.spotlight.className).not.toMatch(/col-span-(full|[3-9])/);
  });

  // The fix-forward for STAGING-VERIFY run 41329713260: the prefixes above only
  // mean "≥1280 → 5 columns (40%)" and "1024-1279 → 4 columns" with this
  // repo's screens. At 1400 px the old `lg:grid-cols-4 xl:grid-cols-5` gave the
  // 4-column shape (spotlight 49%) because `xl` here is 1536 px.
  it('maps the 5-column (40%) shape to >=1280 px and the 4-column shape to 1024-1279 px in this repo', () => {
    const screens = (tailwindConfig as { theme: { screens: Record<string, string> } }).theme.screens;
    expect(screens.md).toBe('1024px');
    expect(screens.lg).toBe('1280px');
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(6)} />);
    const s = slots(container);
    const cols = (prefix: string) => s.grid.className.match(new RegExp(`(^|\\s)${prefix}:grid-cols-(\\d)`))?.[2];
    expect(cols('md')).toBe('4');
    expect(cols('lg')).toBe('5');
    expect(s.grid.className).not.toMatch(/(^|\s)(xl|2xl):grid-cols-/);
    // 2 of 5 columns with gap-4 at a 1096 px layout (1400 px viewport) stays under the 45% cap
    const width = 1096;
    const gap = 16;
    const col = (width - 4 * gap) / 5;
    expect((2 * col + gap) / width).toBeLessThanOrEqual(0.45);
  });

  // Round-2 fix-forward: the spotlight spans exactly the tile rows (top = tile row 1,
  // bottom = the last tile row). Its slot is a stretching grid cell over those rows and
  // the card inside it has no fixed media ratio on desktop, only a token minimum that grows
  // into the rows, so it never makes the rows taller than its text needs.
  it('desktop: the spotlight is a stretching cell over exactly the tile rows, its media grows into them', () => {
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(6)} row={{ title: 'Up next', items: compacts(5) }} />);
    const s = slots(container);
    const cls = s.spotlight.className.split(/\s+/);
    expect(cls).toContain('grid');
    expect(cls).toContain('lg:row-span-2');
    expect(cls).toContain('md:row-span-3');
    // nothing that would stop the cell (or the card) stretching to the rows' height
    expect(s.spotlight.className).not.toMatch(/(^|\s)(md:|lg:)?(self-|items-|place-|h-fit|h-auto|h-min|absolute)/);
    const card = s.spotlight.querySelector(':scope > [data-vcard-size="spotlight"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.className).not.toMatch(/(^|\s)(md:|lg:)?(h-|max-h-|self-)/);
    const media = card.querySelector('[data-vcard-media]') as HTMLElement;
    expect(media.className).toContain('md:aspect-auto');
    expect(media.className).toContain('md:min-h-32');
    expect(media.className).toContain('md:flex-1');
    // the row stays a separate full-width row below the tile rows
    expect(s.row!.className).toContain('col-span-full');
  });

  it('never renders more than 6 tiles', () => {
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(9)} />);
    expect(slots(container).tiles.querySelectorAll('[data-vcard-size="standard"]').length).toBe(6);
    expect(screen.queryByText('tile 6')).toBeNull();
  });

  it('3 tiles → 3 rendered, spotlight keeps col-span-2 and spans only the rows that exist', () => {
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(3)} />);
    const s = slots(container);
    expect(s.tiles.querySelectorAll('[data-vcard-size="standard"]').length).toBe(3);
    expect(s.spotlight.className).toContain('lg:col-span-2');
    expect(s.spotlight.className).toContain('lg:row-span-1');
    expect(s.spotlight.className).toContain('md:row-span-2');
  });

  it('0 tiles → the empty state fills the tile area and the spotlight is not widened', () => {
    const { container } = renderGrid(
      <SpotlightGrid spotlight={spot} tiles={[]} empty={<p>Nothing here yet</p>} />,
    );
    const s = slots(container);
    expect(screen.getByText('Nothing here yet').closest('[data-slot="tiles"]')).not.toBeNull();
    expect(s.tiles.querySelectorAll('[data-vcard-size]').length).toBe(0);
    expect(s.spotlight.className).toContain('lg:col-span-2');
    expect(s.spotlight.className).toContain('lg:row-span-1');
    expect(s.spotlight.className).not.toMatch(/col-span-(full|[3-9])/);
  });

  it('an omitted or empty row is not rendered', () => {
    const { container, rerender } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(6)} />);
    expect(slots(container).row).toBeNull();
    rerender(
      <MemoryRouter>
        <SpotlightGrid spotlight={spot} tiles={tiles(6)} row={{ title: 'Up next', items: [] }} />
      </MemoryRouter>,
    );
    expect(slots(container).row).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Up next' })).toBeNull();
  });

  it('renders "See all" links for the section and the row when given', () => {
    renderGrid(
      <SpotlightGrid
        label="Events"
        seeAllTo="/events"
        spotlight={spot}
        tiles={tiles(2)}
        row={{ title: 'Upcoming', seeAllTo: '/events/upcoming', items: compacts(2) }}
      />,
    );
    const links = screen.getAllByRole('link', { name: 'spotlight.grid.seeAll' });
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/events', '/events/upcoming']);
  });

  it('uses logical properties only — no physical left/right classes (RTL)', () => {
    const { container } = renderGrid(
      <SpotlightGrid
        label="L"
        seeAllTo="/x"
        spotlight={spot}
        tiles={tiles(6)}
        row={{ title: 'R', seeAllTo: '/y', items: compacts(5) }}
      />,
    );
    container.querySelectorAll('[class]').forEach((el) => expect(el.getAttribute('class')).not.toMatch(PHYSICAL));
  });
});
