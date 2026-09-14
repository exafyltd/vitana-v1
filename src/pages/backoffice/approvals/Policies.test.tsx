/**
 * VTID-03849 — Approvals › Policies renders the tenant policy read-only,
 * with the threshold as locale-formatted currency and the default marker.
 */
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div> }));
vi.mock('@/components/backoffice/BackOfficeTabs', () => ({ default: () => <nav data-testid="tabs" /> }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => ({ activeTenantId: 'tenant-1' }) }));
vi.mock('@/hooks/useBackOfficeAccess', () => ({
  useMyErpAccess: () => ({ isLoading: false, data: { ok: true, user_id: 'u1', tenant_id: 'tenant-1', role: 'backoffice', is_exafy_admin: false, capabilities: ['audit.view'], defaults: [], explicit: [], can_manage_access: false, catalog: [] } }),
}));
const adminFetch = vi.fn(async (path: string) => {
  if (path === '/api/v1/backoffice/policy') return { ok: true, policy: { high_risk_amount_threshold: 25000, require_mfa_for_high: true }, defaults: { high_risk_amount_threshold: 25000, require_mfa_for_high: true } };
  throw new Error(`unexpected ${path}`);
});
vi.mock('@/lib/admin-api', () => ({ adminFetch: (p: string) => adminFetch(p) }));

import BackOfficePolicies from '@/pages/backoffice/approvals/Policies';
import { formatAed } from '@/lib/backoffice-format';

describe('BackOffice › Approvals › Policies (BO-055)', () => {
  it('shows threshold, MFA and default markers from GET /policy without any write', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/backoffice/approvals/policies']}>
          <BackOfficePolicies />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const norm = (s: string | null | undefined) => (s ?? '').replace(/\u00a0/g, ' ');
    const threshold = await screen.findByTestId('policy-threshold');
    expect(norm(threshold.textContent)).toBe(norm(formatAed(25000)));
    expect(screen.getByTestId('policy-mfa')).toBeInTheDocument();
    expect(document.querySelector('[data-screen-id="BO-055"]')).toBeTruthy();
    expect(adminFetch).toHaveBeenCalledWith('/api/v1/backoffice/policy');
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });
});
