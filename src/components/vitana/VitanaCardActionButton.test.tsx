/** VTID-05085 — the shaped action button: shapes, click, aria-label, tap size. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Camera } from 'lucide-react';
import { VitanaCardActionButton } from './VitanaCardActionButton';
import { ACCENT_CLASSES } from './vitana-card-catalog';

describe('VitanaCardActionButton', () => {
  it.each([
    ['round', 'rounded-full', 'w-9'],
    ['pill', 'rounded-full', 'px-3'],
    ['rounded-square', 'rounded-lg', 'w-9'],
  ] as const)('%s renders its shape classes and is at least 36px tall', (shape, radius, size) => {
    render(<VitanaCardActionButton shape={shape} icon={Camera} label="Hochladen" accent="amber" onClick={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Hochladen' });
    expect(btn.getAttribute('data-shape')).toBe(shape);
    expect(btn.className).toContain(radius);
    expect(btn.className).toContain(size);
    expect(btn.className).toContain('h-9');
  });

  it('shows the label only on the pill; round and rounded-square carry it as aria-label', () => {
    const { rerender } = render(<VitanaCardActionButton shape="pill" icon={Camera} label="Bio schreiben" accent="orb" onClick={() => {}} />);
    expect(screen.getByText('Bio schreiben')).toBeInTheDocument();
    rerender(<VitanaCardActionButton shape="round" icon={Camera} label="Bio schreiben" accent="orb" onClick={() => {}} />);
    expect(screen.queryByText('Bio schreiben')).toBeNull();
    expect(screen.getByRole('button', { name: 'Bio schreiben' })).toBeInTheDocument();
  });

  it('uses the accent token fill', () => {
    render(<VitanaCardActionButton shape="pill" icon={Camera} label="X" accent="purple" onClick={() => {}} />);
    expect(screen.getByRole('button').className).toContain(ACCENT_CLASSES.purple.button.split(' ')[0]);
  });

  it('fires onClick without bubbling to the card', () => {
    const onClick = vi.fn();
    const onCard = vi.fn();
    render(
      <div onClick={onCard}>
        <VitanaCardActionButton shape="round" icon={Camera} label="Go" accent="rose" onClick={onClick} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onCard).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    const onClick = vi.fn();
    render(<VitanaCardActionButton shape="pill" icon={Camera} label="Go" accent="rose" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
