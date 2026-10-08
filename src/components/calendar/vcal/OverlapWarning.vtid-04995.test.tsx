// VTID-04995 — the overlap warning names own entries, hides titles of busy
// time from other calendars, and says nothing when nothing overlaps.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  getI18nLocale: () => 'en',
}));

import { OverlapWarning } from './OverlapWarning';

const base = { start_time: '2026-10-10T09:00:00.000Z', end_time: '2026-10-10T10:00:00.000Z' };

describe('OverlapWarning (VTID-04995)', () => {
  it('renders nothing without conflicts', () => {
    const { container } = render(<OverlapWarning conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('names an own entry and keeps outside time title-less', () => {
    render(
      <OverlapWarning
        conflicts={[
          { kind: 'own', title: 'Yoga', ...base },
          { kind: 'external', title: null, ...base },
          { kind: 'busy', title: null, ...base },
        ]}
      />,
    );
    const box = screen.getByTestId('vcal-overlap');
    expect(box.getAttribute('role')).toBe('status');
    expect(box.textContent).toContain('vcal.overlap.own:{"title":"Yoga"');
    expect(box.textContent).toContain('vcal.overlap.external');
    expect(box.textContent).toContain('vcal.overlap.busy');
  });

  it('shows at most three lines', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ kind: 'own' as const, title: `E${i}`, ...base }));
    render(<OverlapWarning conflicts={many} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
