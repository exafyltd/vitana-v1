/**
 * Community members directory (phone layout, /comm/members):
 *   - the header has a close (X) button that returns to the screen the user
 *     came from (Events & Meetups → Following → Find People), with a fallback
 *     when there is no in-app history (deep link);
 *   - every member card shows the uploaded photo when there is one, and the
 *     deterministic DiceBear auto-avatar otherwise — never only initials.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ session: { access_token: 'tok' } }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
// Radix only renders <img> after a successful load, which jsdom never reaches — render it directly.
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import Members from './Members';

const MEMBERS = [
  { vitana_id: 'dr286', registration_seq: 286, display_name: 'Dr. Jutta Buchhold', avatar_url: null, location: null, member_since: null, dance_preview: null },
  { vitana_id: 'harold285', registration_seq: 285, display_name: 'Harold Knoll', avatar_url: 'https://cdn.example.test/harold.jpg', location: 'Paris', member_since: null, dance_preview: null },
];

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderAt(entries: string[], index: number) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Routes>
        <Route path="/comm/members" element={<Members />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Members (phone) — close button', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, members: MEMBERS, next_cursor: null }) })),
    );
  });

  it('renders an accessible close (X) button in the header', async () => {
    renderAt(['/comm/members'], 0);
    const close = await screen.findByRole('button', { name: 'common.close' });
    expect(close).toBeInTheDocument();
  });

  it('returns to the previous in-app screen when there is history', async () => {
    renderAt(['/comm/events-meetups?tab=following', '/comm/members'], 1);
    const close = await screen.findByRole('button', { name: 'common.close' });
    fireEvent.click(close);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/comm/events-meetups?tab=following'),
    );
  });

  it('falls back to Events & Meetups → Following on a deep link with no history', async () => {
    renderAt(['/comm/members'], 0);
    const close = await screen.findByRole('button', { name: 'common.close' });
    fireEvent.click(close);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/comm/events-meetups?tab=following'),
    );
  });
});

describe('Members (phone) — avatars', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, members: MEMBERS, next_cursor: null }) })),
    );
  });

  it('shows the uploaded photo when one exists and a DiceBear avatar otherwise', async () => {
    renderAt(['/comm/members'], 0);
    const harold = await screen.findByAltText('Harold Knoll');
    expect(harold).toHaveAttribute('src', 'https://cdn.example.test/harold.jpg');

    const jutta = screen.getByAltText('Dr. Jutta Buchhold');
    expect(jutta.getAttribute('src')).toMatch(/^https:\/\/api\.dicebear\.com\/9\.x\//);
    expect(jutta.getAttribute('src')).toMatch(/seed=dr286/);
  });

  it('keeps the list rendering the same member cards', async () => {
    renderAt(['/comm/members'], 0);
    const list = await screen.findByText('Harold Knoll');
    expect(within(list.closest('button') as HTMLElement).getByText('Harold Knoll')).toBeInTheDocument();
  });
});
