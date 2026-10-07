// VTID-04955 — members panel: title + rename for the creator only, member
// names (the old query asked global_community_profiles for columns it does
// not have → everyone "Unknown"), no emails, and it works right-to-left.
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

const selects: string[] = [];
const PARTICIPANTS = [
  { id: 'p-me', user_id: 'me', role: 'admin', is_active: true },
  { id: 'p-2', user_id: 'u2', role: 'member', is_active: true },
];
const PROFILES: Record<string, { display_name: string; avatar_url: null }> = {
  me: { display_name: 'Dragan', avatar_url: null },
  u2: { display_name: 'Husam', avatar_url: null },
};

function builder(table: string) {
  let userId = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- thenable query-builder stub
  const b: any = {
    select: vi.fn((cols: string) => {
      selects.push(`${table}:${cols}`);
      return b;
    }),
    eq: vi.fn((col: string, val: string) => {
      if (col === 'user_id') userId = val;
      return b;
    }),
    single: vi.fn(() => Promise.resolve({ data: PROFILES[userId], error: null })),
    then: (resolve: (v: unknown) => void) => resolve({ data: PARTICIPANTS, error: null }),
  };
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((table: string) => builder(table)), rpc: vi.fn() },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me', email: 'me@hotmail.com' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));

import GroupMembersModal from './GroupMembersModal';

function renderModal(props: Partial<React.ComponentProps<typeof GroupMembersModal>> = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  document.documentElement.dir = dir;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GroupMembersModal open onOpenChange={() => {}} threadId="t1" context="global" currentUserRole="admin" groupName="Husam Katiela, Stefan Ehlke" createdBy="me" {...props} />
    </QueryClientProvider>,
  );
}

describe('GroupMembersModal (VTID-04955)', () => {
  it('shows the group name and a rename button for the creator; editing prefills the name', async () => {
    renderModal();
    expect(screen.getByTestId('group-title').textContent).toBe('Husam Katiela, Stefan Ehlke');
    fireEvent.click(screen.getByLabelText('screens.messages.renameGroup'));
    expect((screen.getByLabelText('screens.messages.groupNameLabel') as HTMLInputElement).value).toBe('Husam Katiela, Stefan Ehlke');
  });

  it('offers no rename to a member who did not create the group', () => {
    renderModal({ createdBy: 'someone-else', currentUserRole: 'member' });
    expect(screen.queryByLabelText('screens.messages.renameGroup')).toBeNull();
  });

  it('asks the global profile table only for columns it has, shows names and no emails', async () => {
    selects.length = 0;
    renderModal();
    await waitFor(() => expect(screen.getByText('Husam')).toBeTruthy());
    expect(selects).toContain('global_community_profiles:display_name, avatar_url');
    expect(document.body.textContent).not.toContain('@');
  });

  it('lays the title row out with logical properties in RTL', () => {
    renderModal({}, 'rtl');
    const title = screen.getByTestId('group-title');
    expect(title.className).toContain('text-start');
    expect(title.parentElement!.className).toContain('pe-8');
    expect(title.parentElement!.className).not.toMatch(/\b(pr|pl|ml|mr)-/);
    document.documentElement.dir = 'ltr';
  });
});
