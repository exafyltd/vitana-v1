/**
 * VTID-05221: the "New community" panel is mounted on /admin/system/tenants
 * (TenantManagement.tsx) only for an exafy admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const tenantState = vi.hoisted(() => ({ isExafyAdmin: false }));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    activeTenantId: 'tenant-a',
    tenant: { id: 'tenant-a', name: 'A', slug: 'a' },
    isExafyAdmin: tenantState.isExafyAdmin,
    setActiveTenant: vi.fn(),
  }),
}));
vi.mock('@/hooks/useMemberships', () => ({ useMemberships: () => ({ memberships: [] }) }));
vi.mock('@/hooks/useTenantRegistry', () => ({ useTenantRegistry: () => ({ tenants: [], isLoading: false }) }));
vi.mock('@/lib/tenant-registry', () => ({ tenantDisplayNameFor: () => '' }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u-1' }, loading: false }) }));
vi.mock('@/components/admin/AdminHeader', () => ({ default: () => null }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => null }));
vi.mock('@/config/navigation', () => ({ adminTenantManagementNavigation: [] }));
vi.mock('@/components/admin/GeminiApiKeySetup', () => ({ GeminiApiKeySetup: () => null }));
vi.mock('@/components/layout/spotlight', () => ({
  ScreenFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => true }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string) => key,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/components/admin/tenant-provisioning/NewCommunityPanel', () => ({
  NewCommunityPanel: () => <section data-testid="new-community-panel" />,
}));

import TenantManagement from '@/pages/admin/TenantManagement';

beforeEach(() => {
  tenantState.isExafyAdmin = false;
});

describe('TenantManagement — New community panel', () => {
  it('is absent for an admin who is not an exafy admin', () => {
    tenantState.isExafyAdmin = false;
    render(<TenantManagement />);
    expect(screen.getByText('screens.admin.accessRestricted')).toBeInTheDocument();
    expect(screen.queryByTestId('new-community-panel')).toBeNull();
  });

  it('is shown inline for an exafy admin', () => {
    tenantState.isExafyAdmin = true;
    render(<TenantManagement />);
    expect(screen.getByText('screens.admin.switchOrganization')).toBeInTheDocument();
    expect(screen.getByTestId('new-community-panel')).toBeInTheDocument();
  });
});
