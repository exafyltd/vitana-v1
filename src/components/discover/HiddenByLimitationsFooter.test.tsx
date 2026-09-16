/**
 * VTID-03943 — HiddenByLimitationsFooter's `past_purchases` row.
 *
 * The gateway's /discover/search route computed a past-purchase exclusion
 * but never reported the count in `hidden_breakdown`, so a user whose
 * search results dropped an already-purchased product never saw why
 * (only /discover/feed reported it correctly). This component already
 * had full support for a `past_purchases` key — it was untested, so a
 * regression here (or in the backend fix landing this alongside it)
 * would have gone unnoticed the same way the original gap did. This pins
 * the render behavior directly, independent of either route.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HiddenByLimitationsFooter, type HiddenBreakdown } from './HiddenByLimitationsFooter';

vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (key === 'screens.discover.value0HiddenByYourPreferences') {
      return ` hidden by your preferences (${params?.value0})`;
    }
    return key;
  },
}));

function renderFooter(breakdown?: HiddenBreakdown | null) {
  return render(
    <MemoryRouter>
      <HiddenByLimitationsFooter breakdown={breakdown} />
    </MemoryRouter>,
  );
}

const ZERO_BREAKDOWN: HiddenBreakdown = {
  allergies: 0,
  contraindications: 0,
  medications: 0,
  dietary: 0,
  budget: 0,
  sensitivities: 0,
  geo: 0,
  excluded_region: 0,
};

describe('HiddenByLimitationsFooter — past_purchases row (VTID-03943)', () => {
  it('renders nothing when breakdown is null', () => {
    const { container } = renderFooter(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every count, including past_purchases, is zero', () => {
    const { container } = renderFooter({ ...ZERO_BREAKDOWN, past_purchases: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it('counts past_purchases into the total and shows its row once expanded', () => {
    renderFooter({ ...ZERO_BREAKDOWN, past_purchases: 3 });

    expect(screen.getByText('3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('you recently purchased')).toBeInTheDocument();
  });

  it('renders past_purchases alongside another non-zero reason, ranked by count', () => {
    renderFooter({ ...ZERO_BREAKDOWN, allergies: 1, past_purchases: 5 });

    // Total is the sum across all reasons.
    expect(screen.getByText('6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    // Higher count (past_purchases: 5) sorts first.
    expect(rows[0]).toHaveTextContent('you recently purchased');
    expect(rows[1]).toHaveTextContent('contain an allergen you listed');
  });

  it('omits the past_purchases row entirely when the field is absent (backend not yet reporting it)', () => {
    renderFooter({ ...ZERO_BREAKDOWN, budget: 2 });

    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText('you recently purchased')).not.toBeInTheDocument();
  });
});
