/**
 * desktop-spotlight-finish / skeletons (owner decision 3) — SpotlightLoading:
 * desktop Spotlight renders the archetype skeleton or row skeletons, phones the
 * same parts in the single-column shape; both busy, labelled, spinner-free;
 * content swaps in with a fade that reduced motion drops.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
let spotlight = true;
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlight }));
let reduceMotion = false;
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => reduceMotion }));

import { SpotlightLoading } from '../index';

function expectBusyAndSpinnerFree(container: HTMLElement) {
  const root = container.querySelector('[data-spotlight-loading]')!;
  expect(root).not.toBeNull();
  expect(root.getAttribute('aria-busy')).toBe('true');
  expect(root.querySelector('.sr-only')!.textContent).toBe('loading.default');
  expect(container.querySelector('.animate-spin')).toBeNull();
  expect(container.querySelector('svg.lucide-loader-2, svg.lucide-loader-circle')).toBeNull();
}

describe('SpotlightLoading', () => {
  beforeEach(() => {
    spotlight = true;
    reduceMotion = false;
  });

  it('desktop: the archetype skeleton inside a desktop-marked root', () => {
    const { container } = render(<SpotlightLoading archetype="conversation" />);
    const root = container.querySelector('[data-spotlight-loading]')!;
    expect(root.getAttribute('data-spotlight-loading')).toBe('desktop');
    expect(root.getAttribute('data-archetype-skeleton')).toBe('conversation');
    expect(root.querySelector('[data-archetype-skeleton="conversation"]')).not.toBeNull();
    expectBusyAndSpinnerFree(container);
  });

  it('desktop: rows=3 renders exactly 3 row skeletons', () => {
    const { container } = render(<SpotlightLoading rows={3} />);
    expect(container.querySelector('[data-spotlight-loading="desktop"]')!.getAttribute('data-archetype-skeleton')).toBe('rows');
    expect(container.querySelectorAll('[data-vcard-size="row"]').length).toBe(3);
    expectBusyAndSpinnerFree(container);
  });

  it('mobile: single-column shape of the same parts', () => {
    spotlight = false;
    const { container, rerender } = render(<SpotlightLoading archetype="collection" />);
    expect(container.querySelector('[data-spotlight-loading="mobile"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="row"]').length).toBe(6);
    expect(container.querySelector('[data-vcard-size="standard"]')).toBeNull();
    expectBusyAndSpinnerFree(container);

    rerender(<SpotlightLoading archetype="detail" />);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    expect(container.querySelectorAll('[data-vcard-size="row"]').length).toBe(3);

    rerender(<SpotlightLoading archetype="storefront" />);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    expect(container.querySelectorAll('[data-vcard-size="standard"]').length).toBe(2);
    expectBusyAndSpinnerFree(container);
  });

  it('loading true → false swaps the skeleton for the children with a fade', () => {
    const { container, rerender, queryByText } = render(
      <SpotlightLoading loading archetype="collection">
        <p>content</p>
      </SpotlightLoading>,
    );
    expect(queryByText('content')).toBeNull();
    expect(container.querySelector('[data-spotlight-loading]')).not.toBeNull();
    rerender(
      <SpotlightLoading loading={false} archetype="collection">
        <p>content</p>
      </SpotlightLoading>,
    );
    expect(queryByText('content')).not.toBeNull();
    expect(container.querySelector('[data-spotlight-loading]')).toBeNull();
    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('0');
  });

  it('reduced motion: children render with no fade wrapper', () => {
    reduceMotion = true;
    const { container } = render(
      <SpotlightLoading loading={false} archetype="collection">
        <p>still</p>
      </SpotlightLoading>,
    );
    expect(container.firstElementChild!.tagName).toBe('P');
    expect(container.querySelector('[style*="opacity"]')).toBeNull();
  });
});
