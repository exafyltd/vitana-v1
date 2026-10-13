/**
 * VTID-05143 — VitanaChatCard: the chat adapter renders the SAME registry
 * component as the strip; unknown types render nothing; F* cards have no X in
 * a chat, E* cards keep theirs and dismiss on the server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { VitanaCardProps } from './card-props';

const dismiss = vi.fn();
vi.mock('@/hooks/useCardDismiss', () => ({ useCardDismiss: () => ({ isDismissed: false, dismiss }) }));

const { seen, registry } = vi.hoisted(() => {
  const seen: Array<{ type: string; props: VitanaCardProps }> = [];
  const registry: Record<string, unknown> = {};
  return { seen, registry };
});
vi.mock('./card-registry', () => ({
  VITANA_CARD_REGISTRY: registry,
  getVitanaCardComponent: (t: string) => registry[t] ?? null,
}));

function Stub(type: string) {
  return function StubCard(props: VitanaCardProps) {
    seen.push({ type, props });
    return (
      <div data-testid={`card-${type}`}>
        {props.onDismiss && (
          <button type="button" onClick={props.onDismiss}>
            x
          </button>
        )}
      </div>
    );
  };
}
registry.E1 = Stub('E1');
registry.F3 = Stub('F3');

import { VitanaChatCard, isVitanaCardPayload } from './VitanaChatCard';

beforeEach(() => {
  dismiss.mockReset();
  seen.length = 0;
});

describe('isVitanaCardPayload', () => {
  it('accepts the v1 envelope', () => {
    expect(isVitanaCardPayload({ kind: 'vitana_card', v: 1, card_type: 'E1', params: { a: 1 } })).toBe(true);
    expect(isVitanaCardPayload({ kind: 'vitana_card', v: 1, card_type: 'F3' })).toBe(true);
  });

  it.each([
    null,
    'E1',
    { kind: 'card', v: 1, card_type: 'E1' },
    { kind: 'vitana_card', v: 2, card_type: 'E1' },
    { kind: 'vitana_card', v: 1, card_type: 'Z1' },
    { kind: 'vitana_card', v: 1, card_type: 'E1', params: [] },
    { kind: 'vitana_card', v: 1, card_type: 'E1', params: 'x' },
  ])('rejects %j', (value) => {
    expect(isVitanaCardPayload(value)).toBe(false);
  });
});

describe('VitanaChatCard', () => {
  it('renders the registry component for the card_type and passes params through', () => {
    render(<VitanaChatCard card_type="F3" params={{ from: 'vitana' }} />);
    expect(screen.getByTestId('card-F3')).toBeInTheDocument();
    expect(seen.at(-1)?.props.params).toEqual({ from: 'vitana' });
  });

  it('an unknown or unregistered card_type renders nothing', () => {
    const { container } = render(
      <>
        <VitanaChatCard card_type="Z9" />
        <VitanaChatCard card_type="E5" />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('a feature card in a chat has no X', () => {
    render(<VitanaChatCard card_type="F3" />);
    expect(screen.queryByRole('button', { name: 'x' })).toBeNull();
    expect(seen.at(-1)?.props.onDismiss).toBeUndefined();
  });

  it('an enrichment card keeps its X: server dismiss, then the card disappears from the message', () => {
    render(<VitanaChatCard card_type="E1" />);
    fireEvent.click(screen.getByRole('button', { name: 'x' }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('card-E1')).toBeNull();
  });
});
