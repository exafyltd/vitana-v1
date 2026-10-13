/**
 * VTID-05105 — VCard: four sizes, fixed media ratios, placeholder, text-only,
 * dimmed neighbours keep full text contrast, logical properties only (RTL).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VCard, VCardSkeleton } from './index';

const PHYSICAL = /(^|\s)-?(ml|mr|pl|pr|left|right)-|text-left|text-right|rounded-[lr](\s|-|$)/;

describe('VTID-05105 VCard', () => {
  it.each([
    ['spotlight', 'aspect-video'],
    ['standard', 'aspect-landscape'],
    ['compact', 'size-vcard-thumb'],
    ['row', 'size-vcard-row-thumb'],
  ] as const)('%s exposes data-vcard-size and its fixed media box', (size, mediaClass) => {
    const { container } = render(<VCard size={size} title="Title" media={{ src: 'https://x/a.jpg', alt: 'A' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.vcardSize).toBe(size);
    expect(container.querySelector('[data-vcard-media]')!.className).toContain(mediaClass);
  });

  it('spotlight portrait uses the 4:5 box', () => {
    const { container } = render(<VCard size="spotlight" title="T" media={{ src: 'x.jpg', ratio: 'portrait' }} />);
    expect(container.querySelector('[data-vcard-media]')!.className).toContain('aspect-portrait');
  });

  it('a null src keeps the media box as a placeholder (rows stay even)', () => {
    const { container } = render(<VCard size="standard" title="T" media={{ src: null }} />);
    expect(container.querySelector('[data-vcard-placeholder]')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('omitting media renders a text-only card', () => {
    const { container } = render(<VCard size="spotlight" title="Only text" />);
    expect(container.querySelector('[data-vcard-media]')).toBeNull();
    expect(screen.getByText('Only text')).toBeInTheDocument();
  });

  it('clamps the title to two lines', () => {
    render(<VCard size="standard" title="A long title" />);
    expect(screen.getByText('A long title').className).toContain('line-clamp-2');
  });

  it('images load lazily unless priority', () => {
    const { container, rerender } = render(<VCard size="spotlight" title="T" media={{ src: 'a.jpg' }} />);
    expect(container.querySelector('img')!.getAttribute('loading')).toBe('lazy');
    rerender(<VCard size="spotlight" title="T" media={{ src: 'a.jpg' }} priority />);
    expect(container.querySelector('img')!.getAttribute('loading')).toBe('eager');
  });

  it('dimmed softens only the media; the text block keeps full opacity', () => {
    const { container } = render(<VCard size="spotlight" title="Neighbour" media={{ src: 'a.jpg' }} dimmed />);
    expect(container.querySelector('[data-vcard-media]')!.className).toContain('opacity-60');
    expect(screen.getByText('Neighbour').closest('[class*="opacity"]')).toBeNull();
  });

  it('body and stacked actions only render on spotlight/standard', () => {
    const { rerender } = render(<VCard size="row" title="T" body="Body text" />);
    expect(screen.queryByText('Body text')).toBeNull();
    rerender(<VCard size="standard" title="T" body="Body text" />);
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });

  it('uses logical properties only — no physical left/right classes (RTL)', () => {
    const { container } = render(
      <div>
        <VCard size="spotlight" title="T" media={{ src: 'a.jpg' }} badge={<span>b</span>} actions={<button>a</button>} />
        <VCard size="compact" title="T" media={{ src: 'a.jpg' }} actions={<button>a</button>} />
        <VCardSkeleton size="spotlight" />
        <VCardSkeleton size="row" />
      </div>,
    );
    container.querySelectorAll('[class]').forEach((el) => expect(el.getAttribute('class')).not.toMatch(PHYSICAL));
  });

  it('skeletons carry the same size marker and are hidden from assistive tech', () => {
    const { container } = render(<VCardSkeleton size="compact" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.vcardSize).toBe('compact');
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });
});
