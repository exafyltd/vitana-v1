/**
 * SpotlightConsentToggle.tsx — the consent read previously defaulted to
 * `false` (opted-out) on ANY failure, including a real DB error — a
 * privacy-sensitive read confidently claiming the wrong saved state. A
 * user who already opted into the spotlight would see the toggle
 * rendered "off" on a transient error, indistinguishable from having
 * never opted in.
 *
 * Fixed: a real error now throws (so react-query's `isError` reflects
 * it, not a silently-defaulted `false`), and the switch is disabled
 * while errored so the wrong-looking state can't be confidently acted on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

let selectResult: { data: unknown; error: unknown };

function makeBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(selectResult)),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => makeBuilder()) },
}));
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));

import { SpotlightConsentToggle } from './SpotlightConsentToggle';

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(SpotlightConsentToggle)),
  );
}

describe('SpotlightConsentToggle — consent-read error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the switch (does not confidently show "off") when the consent read errors', async () => {
    selectResult = { data: null, error: { message: 'connection reset' } };
    renderWithClient();

    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled());
  });

  it('shows checked and enabled when the user has genuinely opted in', async () => {
    selectResult = { data: { index_spotlight_consent: true }, error: null };
    renderWithClient();

    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('switch')).not.toBeDisabled();
  });
});
