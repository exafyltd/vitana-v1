/**
 * VTID-05420 (spotlight-card-proportion/layout-core) — SpotlightGrid, contract
 * SR-31: one Spotlight card at ~40% (xl) / 50% (lg) of the content width,
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

  it('places the spotlight at 2 of 5 columns (xl) / 2 of 4 (lg), spanning the tile rows', () => {
    const { container } = renderGrid(<SpotlightGrid spotlight={spot} tiles={tiles(6)} />);
    const s = slots(container);
    expect(s.grid.className).toContain('lg:grid-cols-4');
    expect(s.grid.className).toContain('xl:grid-cols-5');
    expect(s.spotlight.className).toContain('lg:col-span-2');
    expect(s.spotlight.className).toContain('xl:col-span-2');
    expect(s.spotlight.className).toContain('xl:row-span-2');
    expect(s.spotlight.className).toContain('lg:row-span-3');
    expect(s.spotlight.className).not.toMatch(/col-span-(full|[3-9])/);
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
    expect(s.spotlight.className).toContain('xl:col-span-2');
    expect(s.spotlight.className).toContain('xl:row-span-1');
    expect(s.spotlight.className).toContain('lg:row-span-2');
  });

  it('0 tiles → the empty state fills the tile area and the spotlight is not widened', () => {
    const { container } = renderGrid(
      <SpotlightGrid spotlight={spot} tiles={[]} empty={<p>Nothing here yet</p>} />,
    );
    const s = slots(container);
    expect(screen.getByText('Nothing here yet').closest('[data-slot="tiles"]')).not.toBeNull();
    expect(s.tiles.querySelectorAll('[data-vcard-size]').length).toBe(0);
    expect(s.spotlight.className).toContain('xl:col-span-2');
    expect(s.spotlight.className).toContain('xl:row-span-1');
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
