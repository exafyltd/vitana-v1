/**
 * VTID-03916 — the role switcher's navigation after a successful switch.
 *
 * VTID-03909 made setRole() await a confirmed write before ProfileDrawer
 * navigates at all (closing a race where a hard hard-reload could land
 * before the RPC's outcome was known). This VTID removes the hard
 * `window.location.assign()` reload that raced predated it — reported live
 * as a "glitch": every switch flashed the whole app to white and rebuilt it
 * from scratch. Since the query cache is already confirmed-correct by the
 * time this function reaches the navigation call (the same precondition
 * VTID-03909 established), a normal client-side `navigate()` is safe and
 * removes the reload.
 *
 * These tests pin: navigate() (not a hard reload) fires only after setRole
 * resolves ok, goes to the right destination per role, and a rejected
 * switch does NOT navigate at all (stays on the current screen, shows an
 * error) — the exact failure mode VTID-03909 fixed for backoffice/
 * developer/infra before VTID-03916 removed the CHECK constraint that was
 * the real cause of those three actually failing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const setRoleMock = vi.fn();
vi.mock('@/hooks/useRole', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useRole')>('@/hooks/useRole');
  return { ...actual, useRole: () => ({ currentRole: 'community', setRole: setRoleMock }) };
});

vi.mock('@/context/ProfileProvider', () => ({
  useProfile: () => ({ profile: { displayName: 'Test User', initials: 'TU', role: 'community', avatar: '', avatarOffsetX: 0, avatarOffsetY: 0 } }),
}));
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { id: 'u1', email: 'test@example.com' } }),
}));
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({ tenant: { slug: 'maxina', name: 'Maxina' }, activeTenantId: 'tenant-1', isExafyAdmin: true }),
}));
vi.mock('@/hooks/useMemberships', () => ({ useMemberships: () => ({ roles: [] }) }));
vi.mock('@/hooks/useSmartRouting', () => ({ useTenantLogoutRedirect: () => ({ getLogoutRedirectUrl: () => '/' }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/i18n-toast', () => ({
  notify: vi.fn(),
  notifyError: vi.fn(),
  t: (key: string) => key,
}));

// Radix Select has no established jsdom-driving pattern in this repo (no
// prior test exercises it) — stand in with a flat set of buttons, one per
// role, that call onValueChange directly. What's under test here is
// handleRoleChange's post-switch logic, not Select's own pointer handling.
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange }: { onValueChange: (v: string) => void }) => (
    <div>
      {['community', 'patient', 'professional', 'staff', 'backoffice', 'admin', 'developer', 'infra'].map((r) => (
        <button key={r} data-testid={`role-${r}`} onClick={() => onValueChange(r)}>
          {r}
        </button>
      ))}
    </div>
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ProfileDrawer } from './ProfileDrawer';

function renderDrawer() {
  return render(
    <MemoryRouter>
      <ProfileDrawer trigger={<button>open</button>} />
    </MemoryRouter>,
  );
}

describe('ProfileDrawer role switch', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    setRoleMock.mockReset();
  });

  it('navigates via the router\'s client-side navigate() once the switch is confirmed', async () => {
    // The component only has one navigation primitive available to it in
    // this test (the mocked useNavigate() above) — a real
    // window.location.assign() call, if the old hard-reload code path were
    // reintroduced, would bypass the mock entirely and this test would
    // simply see navigateMock never called, which the assertion below
    // already catches.
    setRoleMock.mockResolvedValueOnce({ ok: true });
    renderDrawer();
    fireEvent.click(screen.getByTestId('role-backoffice'));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/backoffice/dashboard'));
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['admin', '/admin'],
    ['staff', '/admin'],
    ['backoffice', '/backoffice/dashboard'],
    ['professional', '/professional/dashboard'],
    ['patient', '/patient/dashboard'],
    ['developer', '/home'],
    ['infra', '/home'],
    ['community', '/home'],
  ])('routes %s to %s', async (role, destination) => {
    setRoleMock.mockResolvedValueOnce({ ok: true });
    renderDrawer();
    fireEvent.click(screen.getByTestId(`role-${role}`));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith(destination));
  });

  it('does NOT navigate when the write is rejected (e.g. the pre-VTID-03916 backoffice/developer/infra failure)', async () => {
    setRoleMock.mockResolvedValueOnce({ ok: false, error: 'Role not granted for this tenant or invalid role assignment' });
    renderDrawer();
    fireEvent.click(screen.getByTestId('role-infra'));

    await waitFor(() => expect(setRoleMock).toHaveBeenCalledWith('infra'));
    // Give any (incorrect) navigation a chance to fire before asserting its absence.
    await new Promise((r) => setTimeout(r, 20));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
