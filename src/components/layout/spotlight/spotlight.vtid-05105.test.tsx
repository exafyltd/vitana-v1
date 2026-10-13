/**
 * VTID-05105 — Spotlight layout primitives: container-query rail rule, archetype
 * widths, ScreenFrame chrome order (SubNavigation → compact StandardHeader →
 * utility row with SplitBar at its end → layout), immersive hides in-screen
 * chrome, focus-feed keyboard, archetype skeletons, reduced motion.
 */
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id: string; name: string }[] }) => (
    <nav data-testid="subnav">{items.map((i) => i.name).join(',')}</nav>
  ),
}));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="header" data-density={p.density}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: React.ReactNode; compact?: boolean }) => (
    <div data-testid="utility" data-compact={String(!!p.compact)}>{p.children}</div>
  ),
}));
let reduceMotion = false;
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => reduceMotion }));

import {
  ARCHETYPES,
  ARCHETYPE_WIDTH,
  ArchetypeSkeleton,
  ScreenFrame,
  SpotlightLayout,
  isArchetype,
  nextIndexForKey,
  useFocusedCard,
} from './index';
import { VCard } from '@/components/ui/vcard';

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('VTID-05105 SpotlightLayout', () => {
  it('the layout root is a CSS container and the rail rule is a 1060 px container query', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../../index.css'), 'utf8');
    expect(css).toMatch(/\.sp-layout\s*{[^}]*container-type:\s*inline-size/);
    expect(css).toMatch(/@container spotlight \(min-width: 1060px\)/);
    const { container } = inRouter(<SpotlightLayout rail={<div>rail</div>}>stage</SpotlightLayout>);
    expect(container.querySelector('.sp-layout')!.getAttribute('data-width')).toBe('stage-rail');
  });

  it('renders the rail landmark and a toggle for narrow main areas; no rail for non stage-rail widths', () => {
    const { container, rerender } = inRouter(<SpotlightLayout rail={<div>context</div>}>stage</SpotlightLayout>);
    expect(container.querySelector('aside.sp-rail')).not.toBeNull();
    expect(screen.getByText('spotlight.rail.open')).toBeInTheDocument();
    rerender(<MemoryRouter><SpotlightLayout width="wide" rail={<div>context</div>}>stage</SpotlightLayout></MemoryRouter>);
    expect(container.querySelector('aside.sp-rail')).toBeNull();
  });

  it('the toggle opens the rail in a sheet', () => {
    inRouter(<SpotlightLayout rail={<div>context-item</div>}>stage</SpotlightLayout>);
    fireEvent.click(screen.getByText('spotlight.rail.open'));
    expect(screen.getAllByText('context-item').length).toBe(2);
  });

  it('every archetype has a width; only known names are archetypes', () => {
    ARCHETYPES.forEach((a) => expect(ARCHETYPE_WIDTH[a]).toBeTruthy());
    expect(isArchetype('focus-feed')).toBe(true);
    expect(isArchetype('bento')).toBe(false);
  });
});

describe('VTID-05105 ScreenFrame', () => {
  const tabs = { value: 'all', onValueChange: vi.fn(), items: [{ value: 'all', label: 'All' }, { value: 'c', label: 'Community' }] };

  it('composes the existing chrome in the fixed order with a compact header and the tabs at the end of the utility row', () => {
    const { container } = inRouter(
      <ScreenFrame
        archetype="focus-feed"
        subNav={{ items: [{ id: 'o', name: 'Overview', path: '/x' }] }}
        header={{ title: 'News', description: 'd' }}
        utility={{ children: <button>Search</button> }}
        tabs={tabs}
        rail={<div>rail</div>}
      >
        <p>stage-content</p>
      </ScreenFrame>,
    );
    const root = container.querySelector('[data-archetype]')!;
    expect(root.getAttribute('data-archetype')).toBe('focus-feed');
    const order = ['subnav', 'header', 'utility'].map((id) => screen.getByTestId(id));
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('header').dataset.density).toBe('compact');
    expect(screen.getByTestId('utility').dataset.compact).toBe('true');
    const row = container.querySelector('[data-spotlight-utility]')!;
    expect(row.lastElementChild!.getAttribute('role')).toBe('tablist');
    expect(screen.getByText('stage-content').closest('[data-spotlight-stage]')).not.toBeNull();
  });

  it('immersive renders no in-screen chrome', () => {
    inRouter(
      <ScreenFrame archetype="immersive" subNav={{ items: [] }} header={{ title: 'T', description: 'd' }} utility={{}} tabs={tabs}>
        <p>media</p>
      </ScreenFrame>,
    );
    expect(screen.queryByTestId('subnav')).toBeNull();
    expect(screen.queryByTestId('header')).toBeNull();
    expect(screen.queryByTestId('utility')).toBeNull();
    expect(screen.getByText('media')).toBeInTheDocument();
  });

  it('storefront uses the wide width and drops the rail', () => {
    const { container } = inRouter(<ScreenFrame archetype="storefront" rail={<div>r</div>}><p>x</p></ScreenFrame>);
    expect(container.querySelector('.sp-layout')!.getAttribute('data-width')).toBe('wide');
    expect(container.querySelector('aside.sp-rail')).toBeNull();
  });

  it('reduced motion renders the stage without the fade wrapper', () => {
    reduceMotion = true;
    const { container } = inRouter(<ScreenFrame archetype="detail"><p>still</p></ScreenFrame>);
    expect(container.querySelector('[data-spotlight-stage] > p')).not.toBeNull();
    reduceMotion = false;
  });
});

describe('VTID-05105 focus feed keyboard', () => {
  it('J/K and arrows move within bounds; other keys do nothing', () => {
    expect(nextIndexForKey('j', 0, 3)).toBe(1);
    expect(nextIndexForKey('ArrowDown', 2, 3)).toBe(2);
    expect(nextIndexForKey('K', 0, 3)).toBe(0);
    expect(nextIndexForKey('ArrowUp', 2, 3)).toBe(1);
    expect(nextIndexForKey('x', 1, 3)).toBeNull();
    expect(nextIndexForKey('j', 0, 0)).toBeNull();
  });

  function Feed() {
    const ref = useRef<HTMLDivElement>(null);
    const { focusedIndex } = useFocusedCard(ref);
    return (
      <div ref={ref}>
        <span data-testid="focused">{focusedIndex}</span>
        <input aria-label="typing" />
        {[0, 1, 2].map((i) => <VCard key={i} size="spotlight" title={`card ${i}`} focused={i === focusedIndex} />)}
      </div>
    );
  }

  it('J scrolls the next card into view; typing in a field is ignored', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<Feed />);
    fireEvent.keyDown(window, { key: 'j' });
    expect(screen.getByTestId('focused').textContent).toBe('1');
    expect(scroll).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByLabelText('typing'), { key: 'j' });
    expect(screen.getByTestId('focused').textContent).toBe('1');
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});

describe('VTID-05105 archetype skeletons', () => {
  it.each(ARCHETYPES)('%s renders a busy skeleton in its own shape', (a) => {
    const { container } = render(<ArchetypeSkeleton archetype={a} />);
    const el = container.querySelector(`[data-archetype-skeleton="${a}"]`)!;
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-busy')).toBe('true');
  });
});
