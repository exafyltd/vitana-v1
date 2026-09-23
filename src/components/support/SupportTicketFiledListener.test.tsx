/**
 * VTID-04385 — a spoken report that became a ticket shows its number on
 * screen with a link, and refreshes the member's ticket list.
 */
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import * as fs from 'fs';
import * as path from 'path';

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }));
vi.mock('@/lib/i18n-toast', () => ({
  lookup: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join(',')}` : k),
}));

import { SupportTicketFiledListener, SUPPORT_TICKET_FILED_EVENT, ticketLinkFor } from './SupportTicketFiledListener';

let currentPath = '';
function PathProbe() {
  const loc = useLocation();
  currentPath = `${loc.pathname}${loc.search}`;
  return null;
}

function mount() {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/home']}>
        <SupportTicketFiledListener />
        <Routes><Route path="*" element={<PathProbe />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate };
}

const fire = (detail: Record<string, unknown>) =>
  act(() => { window.dispatchEvent(new CustomEvent(SUPPORT_TICKET_FILED_EVENT, { detail })); });

beforeEach(() => { toastSuccess.mockReset(); });

describe('SupportTicketFiledListener', () => {
  it('shows the ticket number with a link and refreshes the ticket list', () => {
    const { invalidate } = mount();
    fire({ ticketId: 'tk-1', ticketNumber: 'FB-2026-09-000140', url: '/comm/talk-to-vitana?ticket=tk-1' });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    const [title, opts] = toastSuccess.mock.calls[0];
    expect(title).toBe('supportTickets.submittedTitle');
    expect(opts.description).toBe('supportTickets.submittedNumber|FB-2026-09-000140');
    expect(opts.action.label).toBe('supportTickets.viewTicket');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['feedback-tickets-mine'] });
    act(() => opts.action.onClick());
    expect(currentPath).toBe('/comm/talk-to-vitana?ticket=tk-1');
  });

  it('ignores an event with no ticket', () => {
    mount();
    fire({});
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('ticketLinkFor', () => {
  it('follows same-app paths only', () => {
    expect(ticketLinkFor({ url: '/comm/talk-to-vitana?ticket=a' })).toBe('/comm/talk-to-vitana?ticket=a');
    expect(ticketLinkFor({ url: 'https://evil.example/x', ticketId: 'a' })).toBe('/comm/talk-to-vitana?ticket=a');
    expect(ticketLinkFor({ url: '//evil.example/x' })).toBe('/comm/talk-to-vitana');
  });
});

describe('wiring', () => {
  it('is mounted in App and the widget cache-bust names this change', () => {
    const root = path.join(__dirname, '..', '..', '..');
    expect(fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8')).toContain('<SupportTicketFiledListener />');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html.match(/orb-widget\.js\?v=20260923-vtid-04385-ticket-filed/g)).toHaveLength(2);
  });
});
