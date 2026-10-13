/**
 * VTID-05105 — StandardHeader density: 'compact' keeps the emoji/title/
 * description and the Autopilot + Vitana Index tiles; the default desktop
 * header is unchanged.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 3, getLatestActions: () => [] }) }));
vi.mock('@/hooks/useVitanaIndex', () => ({ useVitanaIndex: () => ({ index: { total: 742 }, isLoading: false }) }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }));

import StandardHeader from './StandardHeader';

describe('VTID-05105 StandardHeader density', () => {
  it('compact: same content, both tiles, no large header', () => {
    const { container } = render(<StandardHeader density="compact" title="News" description="Stay up to date" emoji="📰" />);
    expect(container.querySelector('[data-header-density="compact"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'News' }).className).toContain('text-xl');
    expect(screen.getByText('Stay up to date')).toBeInTheDocument();
    expect(screen.getByText('screens.common.autopilot')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('742')).toBeInTheDocument();
    expect(screen.getByLabelText(/spotlight\.header\.vitanaIndexAria/)).toBeInTheDocument();
    expect(container.querySelector('.text-3xl')).toBeNull();
  });

  it('default density renders today\'s large desktop header', () => {
    const { container } = render(<StandardHeader title="News" description="Stay up to date" />);
    expect(container.querySelector('[data-header-density]')).toBeNull();
    expect(screen.getByRole('heading').className).toContain('text-3xl');
  });
});
