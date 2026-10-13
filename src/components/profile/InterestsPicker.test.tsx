/** VTID-05085 — InterestsPicker: slugs in, slugs out, max 10, translated labels, failure toast. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const selectResult: { data: unknown } = { data: null };
const updates: Array<{ values: Record<string, unknown>; eq: [string, string] }> = [];
const updateError: { error: unknown } = { error: null };
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => selectResult }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async (col: string, val: string) => {
          updates.push({ values, eq: [col, val] });
          return updateError;
        },
      }),
    }),
  },
}));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  notifySuccess: (...a: unknown[]) => notifySuccess(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));

import { InterestsPicker, INTEREST_SLUGS, MAX_INTERESTS } from './InterestsPicker';
import de from '@/i18n/de/screens.json';

const labels = (de as { screens: { interests: Record<string, string> } }).screens.interests;

beforeEach(() => {
  selectResult.data = null;
  updates.length = 0;
  updateError.error = null;
  notifySuccess.mockReset();
  notifyError.mockReset();
});

describe('InterestsPicker', () => {
  it('offers about 15 fixed interests, each with a German label', () => {
    render(<InterestsPicker open onOpenChange={() => {}} />);
    expect(INTEREST_SLUGS.length).toBe(15);
    for (const slug of INTEREST_SLUGS) expect(screen.getByRole('button', { name: labels[slug] })).toBeInTheDocument();
  });

  it('preselects the saved slugs and ignores unknown ones', async () => {
    selectResult.data = { interests: ['yoga', 'not-a-slug'] };
    render(<InterestsPicker open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('interest-yoga').getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByTestId('interest-sleep').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves slugs (never labels) for the signed-in member only', async () => {
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    render(<InterestsPicker open onOpenChange={onOpenChange} onSaved={onSaved} />);
    fireEvent.click(screen.getByTestId('interest-sleep'));
    fireEvent.click(screen.getByTestId('interest-nutrition'));
    fireEvent.click(screen.getByTestId('interests-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(['sleep', 'nutrition']));
    expect(updates[0].values.interests).toEqual(['sleep', 'nutrition']);
    expect(updates[0].eq).toEqual(['user_id', 'user-1']);
    expect(notifySuccess).toHaveBeenCalledWith('toasts.vitanaCards.interestsSaved');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it(`stops at ${MAX_INTERESTS}: the rest are disabled`, () => {
    render(<InterestsPicker open onOpenChange={() => {}} />);
    INTEREST_SLUGS.slice(0, MAX_INTERESTS).forEach((s) => fireEvent.click(screen.getByTestId(`interest-${s}`)));
    const rest = INTEREST_SLUGS.slice(MAX_INTERESTS);
    for (const s of rest) expect(screen.getByTestId(`interest-${s}`)).toBeDisabled();
    expect(screen.getByText(`${MAX_INTERESTS} von ${MAX_INTERESTS} ausgewählt`)).toBeInTheDocument();
  });

  it('a failed save keeps the picker open and tells the member', async () => {
    updateError.error = { message: 'column does not exist' };
    const onOpenChange = vi.fn();
    render(<InterestsPicker open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('interest-yoga'));
    fireEvent.click(screen.getByTestId('interests-save'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('toasts.vitanaCards.interestsSaveFailed'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
