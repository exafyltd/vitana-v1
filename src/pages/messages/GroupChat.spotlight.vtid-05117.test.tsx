/**
 * VTID-05117 — with Spotlight on (desktop + flag) the group thread opens inside
 * the Vitanaland frame on the conversation archetype: the exit stays on screen
 * while loading (skeleton, no spinner), the loaded thread shows its messages and
 * the same composer, and a failed load offers the way back to the inbox.
 * Everything is mocked — no network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => true }));

const fetchGroup = vi.fn();
const fetchGroupMessages = vi.fn();
vi.mock('@/hooks/useChatApi', () => ({
  fetchGroup: (...a: unknown[]) => fetchGroup(...a),
  fetchGroupMessages: (...a: unknown[]) => fetchGroupMessages(...a),
  sendGroupMessage: vi.fn(),
  markGroupRead: vi.fn(() => Promise.resolve()),
  updateGroupMessage: vi.fn(),
  deleteGroupMessage: vi.fn(),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn() } };
});
vi.mock('@/components/messages/MessageInput', () => ({ default: () => <div data-testid="composer" /> }));
vi.mock('@/components/messages/MessageBubble', () => ({ default: () => <div data-testid="bubble" /> }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="header" data-density={p.density}>{p.title}</header>,
}));

import GroupChat from './GroupChat';

const GROUP = {
  id: 'g1',
  name: 'Alle Beisammen',
  is_system: true,
  metadata: {},
  members: [{ user_id: 'me', display_name: 'Me' }],
  member_count: 1,
};

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderAt(path = '/inbox/g/g1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inbox" element={<Where />} />
        <Route path="/inbox/g/:groupId" element={<GroupChat />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VTID-05117 GroupChat on Spotlight', () => {
  beforeEach(() => {
    fetchGroup.mockReset();
    fetchGroupMessages.mockReset();
    fetchGroupMessages.mockResolvedValue([]);
  });

  it('loading: conversation frame, the exit is on screen, skeleton instead of a spinner', () => {
    fetchGroup.mockReturnValue(new Promise(() => {}));
    const { container } = renderAt();
    expect(container.querySelector('[data-archetype="conversation"]')).not.toBeNull();
    expect(screen.getByTestId('group-chat-back')).toBeTruthy();
    expect(container.querySelector('[data-member-skeleton]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('loaded: compact header with the group name, messages area and the same composer', async () => {
    fetchGroup.mockResolvedValue(GROUP);
    fetchGroupMessages.mockResolvedValue([
      { id: 'm1', sender_id: 'me', group_id: 'g1', content: 'Hallo', created_at: new Date().toISOString(), tenant_id: '' },
    ]);
    renderAt();
    expect(await screen.findByTestId('composer')).toBeTruthy();
    expect(screen.getByTestId('header')).toHaveTextContent('Alle Beisammen');
    expect(screen.getByTestId('header')).toHaveAttribute('data-density', 'compact');
    expect(await screen.findAllByTestId('bubble')).toHaveLength(1);
  });

  it('failed load: an empty state with the way back to the inbox', async () => {
    fetchGroup.mockRejectedValue(new Error('boom'));
    fetchGroupMessages.mockRejectedValue(new Error('boom'));
    renderAt();
    fireEvent.click(await screen.findByText('inbox.group.backToInbox'));
    expect(screen.getByTestId('where')).toHaveTextContent('/inbox');
  });
});
