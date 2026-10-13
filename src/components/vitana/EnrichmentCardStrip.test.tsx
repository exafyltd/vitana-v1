/**
 * VTID-05085 — EnrichmentCardStrip: per screen, both layouts, maxCards,
 * loading / empty / error (never an empty box), dismiss wiring.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { VitanaCardProps } from './card-props';

type Hook = {
  cards: Array<{ card_type: string; category: string; priority: number; title: string; description: string }>;
  isLoading: boolean;
  isError: boolean;
  dismiss: ReturnType<typeof vi.fn>;
};
const hook: Hook = { cards: [], isLoading: false, isError: false, dismiss: vi.fn() };
const requestedScreens: Array<string | null> = [];

vi.mock('@/hooks/useEnrichmentCards', () => ({
  useEnrichmentCards: (s: string | null) => {
    requestedScreens.push(s);
    return hook;
  },
}));

function Stub(type: string) {
  return function StubCard({ title, onDismiss }: VitanaCardProps) {
    return (
      <div data-testid={`card-${type}`}>
        {title}
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            x-{type}
          </button>
        )}
      </div>
    );
  };
}
vi.mock('./card-registry', () => {
  const map: Record<string, unknown> = { E1: Stub('E1'), E2: Stub('E2'), E3: Stub('E3'), E4: Stub('E4'), F3: Stub('F3'), F9: Stub('F9') };
  return { getVitanaCardComponent: (t: string) => map[t] ?? null, VITANA_CARD_REGISTRY: map };
});
vi.mock('./vitana-card-catalog', async (orig) => {
  const real = await orig<typeof import('./vitana-card-catalog')>();
  return {
    ...real,
    CARD_SCREENS: {
      ...real.CARD_SCREENS,
      calendar: { server: 'calendar', features: ['F3', 'F9'] },
      'make-a-post': { server: 'community', allow: ['E3'], features: [] },
    },
  };
});

import { EnrichmentCardStrip } from './EnrichmentCardStrip';

const card = (t: string) => ({ card_type: t, category: 'enrichment', priority: 1, title: `title-${t}`, description: '' });

beforeAll(() => {
  // embla needs these in jsdom
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO);
  vi.stubGlobal('IntersectionObserver', RO);
});

beforeEach(() => {
  hook.cards = [];
  hook.isLoading = false;
  hook.isError = false;
  hook.dismiss = vi.fn();
  requestedScreens.length = 0;
});

describe('EnrichmentCardStrip', () => {
  it('asks the gateway for its own screen and renders the server cards in order, with their localized titles', () => {
    hook.cards = [card('E1'), card('E2')];
    render(<EnrichmentCardStrip screen="profile" maxCards={11} />);
    expect(requestedScreens).toContain('profile');
    const ids = screen.getAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'));
    expect(ids).toEqual(['card-E1', 'card-E2']);
    expect(screen.getByText('title-E1')).toBeInTheDocument();
  });

  it('caps at maxCards (default 3)', () => {
    hook.cards = [card('E1'), card('E2'), card('E3'), card('E4')];
    render(<EnrichmentCardStrip screen="home" />);
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(3);
  });

  it('server cards first, then the screen feature cards', () => {
    hook.cards = [card('E1')];
    render(<EnrichmentCardStrip screen="calendar" maxCards={5} />);
    expect(screen.getAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'))).toEqual(['card-E1', 'card-F3', 'card-F9']);
  });

  it('skips card types it cannot render', () => {
    hook.cards = [card('E9'), card('E1')];
    render(<EnrichmentCardStrip screen="profile" />);
    expect(screen.getAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'))).toEqual(['card-E1']);
  });

  it('Make a Post keeps only E3 from the community cards', () => {
    hook.cards = [card('E1'), card('E3')];
    render(<EnrichmentCardStrip screen="make-a-post" maxCards={2} />);
    expect(requestedScreens).toContain('community');
    expect(screen.getAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'))).toEqual(['card-E3']);
  });

  it('renders nothing while loading', () => {
    hook.isLoading = true;
    hook.cards = [card('E1')];
    const { container } = render(<EnrichmentCardStrip screen="calendar" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing (no empty box) when every card is done', () => {
    const { container } = render(<EnrichmentCardStrip screen="profile" />);
    expect(container.innerHTML).toBe('');
  });

  it('a gateway error drops only the server cards; with no feature cards it renders nothing', () => {
    hook.isError = true;
    const { container, unmount } = render(<EnrichmentCardStrip screen="profile" />);
    expect(container.innerHTML).toBe('');
    unmount();
    render(<EnrichmentCardStrip screen="calendar" />);
    expect(screen.getAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'))).toEqual(['card-F3', 'card-F9']);
  });

  it('stacked layout is a vertical list; carousel layout uses the carousel', () => {
    hook.cards = [card('E1'), card('E2')];
    const { unmount } = render(<EnrichmentCardStrip screen="profile" layout="stacked" />);
    expect(screen.queryByTestId('vitana-card-carousel')).toBeNull();
    expect(screen.getByTestId('vitana-card-strip-profile').getAttribute('data-layout')).toBe('stacked');
    unmount();
    render(<EnrichmentCardStrip screen="profile" layout="carousel" />);
    expect(screen.getByTestId('vitana-card-carousel')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^card-/)).toHaveLength(2);
  });

  it('an enrichment X dismisses on the server', () => {
    hook.cards = [card('E1')];
    render(<EnrichmentCardStrip screen="profile" />);
    fireEvent.click(screen.getByText('x-E1'));
    expect(hook.dismiss).toHaveBeenCalledWith('E1');
  });

  it('a feature X hides it on this device for 7 days and the strip drops it', () => {
    render(<EnrichmentCardStrip screen="calendar" />);
    fireEvent.click(screen.getByText('x-F3'));
    expect(localStorage.getItem('vitana.card.F3.dismissed_at')).toMatch(/^\d+$/);
    expect(screen.queryByTestId('card-F3')).toBeNull();
    expect(screen.getByTestId('card-F9')).toBeInTheDocument();
    expect(hook.dismiss).not.toHaveBeenCalled();
  });
});
