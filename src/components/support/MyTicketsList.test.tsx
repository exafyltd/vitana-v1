/**
 * VTID-04335 — the one member ticket list: ticket number, one status
 * vocabulary, the answer once resolved, and the ?ticket= deep link.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const fetchMock = vi.fn();
vi.mock('@/lib/community-gateway', () => ({ communityFetch: (...a: unknown[]) => fetchMock(...a) }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join(',')}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/lib/locale-format', () => ({ fmtDate: () => '22.09.2026' }));

import { MyTicketsList } from './MyTicketsList';

const TICKETS = [
  { id: 't1', ticket_number: 'FB-2026-09-000101', kind: 'bug', status: 'resolved', created_at: '2026-09-22T10:00:00Z', resolver_agent: 'devon', answer_md: 'We fixed the save button.', resolution_md: null, structured_fields: { voice_origin: true } },
  { id: 't2', ticket_number: 'FB-2026-09-000102', kind: 'support_question', status: 'spec_ready', created_at: '2026-09-21T10:00:00Z', answer_md: null, resolution_md: null },
  { id: 't3', ticket_number: 'FB-2026-09-000103', kind: 'feature_request', status: 'wont_fix', created_at: '2026-09-20T10:00:00Z' },
];

function renderList(url = '/support', props: Record<string, unknown> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <MyTicketsList {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/v1/feedback/tickets/mine')) return { ok: true, json: async () => ({ ok: true, tickets: TICKETS }) };
    return { ok: true, json: async () => ({ ok: true }) };
  });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('MyTicketsList', () => {
  it('reads /api/v1/feedback/tickets/mine and shows every ticket number', async () => {
    renderList();
    for (const tk of TICKETS) expect(await screen.findByText(tk.ticket_number)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/v1\/feedback\/tickets\/mine/);
  });

  it('renders the member vocabulary, not internal statuses', async () => {
    renderList();
    await screen.findByText('FB-2026-09-000102');
    const cards = screen.getAllByTestId('member-ticket');
    expect(cards[1].textContent).toContain('supportTickets.status.under_review');
    expect(cards[2].textContent).toContain('supportTickets.status.wont_fix');
    expect(document.body.textContent).not.toContain('spec_ready');
  });

  it('shows the answer and confirm/reopen only on a resolved ticket', async () => {
    renderList();
    const answers = await screen.findAllByTestId('ticket-answer');
    expect(answers).toHaveLength(1);
    expect(answers[0].textContent).toContain('We fixed the save button.');
    expect(screen.getByText('supportTickets.didItWorkNamed|Devon')).toBeInTheDocument();
    fireEvent.click(screen.getByText('supportTickets.yesFixed'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/feedback/tickets/t1/confirm', { method: 'POST' }));
  });

  it('highlights and scrolls to the ?ticket= deep link (id or FB number)', async () => {
    renderList('/comm/talk-to-vitana?ticket=t2');
    await screen.findByText('FB-2026-09-000102');
    const cards = screen.getAllByTestId('member-ticket');
    expect(cards[1].getAttribute('data-highlighted')).toBe('true');
    expect(cards[0].getAttribute('data-highlighted')).toBeNull();
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('finds a deep-linked ticket beyond the first page', async () => {
    renderList('/support?ticket=FB-2026-09-000103', { pageSize: 1 });
    await screen.findByText('FB-2026-09-000103');
    expect(screen.getAllByTestId('member-ticket')).toHaveLength(3);
  });

  it('filters by kind (Diary shows bug / UX only)', async () => {
    renderList('/diary', { kinds: ['bug', 'ux_issue'] });
    await screen.findByText('FB-2026-09-000101');
    expect(screen.getAllByTestId('member-ticket')).toHaveLength(1);
  });
});
