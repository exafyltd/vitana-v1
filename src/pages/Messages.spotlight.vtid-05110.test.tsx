/**
 * VTID-05110 — Messages page: the Spotlight layout is switched by
 * useSpotlightEnabled() only. Flag off (desktop) and phones render the legacy
 * layouts; flag on renders ScreenFrame(conversation) around the SAME
 * ConversationView with the same props — chat data flow, caching, realtime
 * and send logic are untouched. Everything is mocked; nothing is sent.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let spotlightOn = false;
let mobile = false;
let threadsLoading = false;
const conversationProps: Array<Record<string, unknown>> = [];

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
  getI18nLocale: () => 'de-DE',
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me', email: 'me@example.com' } }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header>{p.title}</header> }));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => <div data-testid="search" /> }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/messages/ConversationView', () => ({
  default: (p: Record<string, unknown>) => {
    conversationProps.push(p);
    return <div data-testid="conversation-view" data-thread={String(p.threadId)} />;
  },
}));
vi.mock('@/components/messages/PresenceIndicator', () => ({ default: () => null }));
vi.mock('@/components/messages/GroupAvatarStack', () => ({ default: () => null }));
vi.mock('@/components/messages/TypingIndicator', () => ({ default: () => null }));
vi.mock('@/components/messages/EmptyStateIllustration', () => ({ default: () => <div>empty</div> }));
vi.mock('@/components/messages/ConversationListSkeleton', () => ({ default: () => <div data-testid="legacy-list-skeleton" /> }));
vi.mock('@/components/messages/CreateGroupPopup', () => ({ default: () => null }));
vi.mock('@/components/NewConversationPopup', () => ({ default: () => null }));
vi.mock('@/components/contacts/ContactsTabContent', () => ({ default: () => <div data-testid="contacts" /> }));
vi.mock('@/components/CallManager', () => ({ CallManager: () => null }));
vi.mock('@/context/CallContext', () => ({ CallProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock('@/components/mobile/MobileActionChips', () => ({ VitanaIndexChip: () => null, AutopilotChip: () => null }));
vi.mock('@/components/messages/mobile/MobileConversationCard', () => ({
  MobileConversationCard: (p: { name: string }) => <div data-testid="mobile-row">{p.name}</div>,
}));
vi.mock('@/components/messages/mobile/MobileInboxEmptyState', () => ({ MobileInboxEmptyState: () => null }));
vi.mock('@/components/messages/mobile/MobileConversationSkeleton', () => ({ MobileConversationSkeleton: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));

const thread = {
  id: 't1',
  type: 'direct',
  created_by: 'me',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-05T10:00:00Z',
  unread_count: 0,
  participants: [{ user_id: 'me', role: 'member' }, { user_id: 'anna', display_name: 'Anna', role: 'member' }],
  last_message: { id: 'm', thread_id: 't1', sender_id: 'anna', body: 'Hallo', message_type: 'text', created_at: '', updated_at: '' },
};
vi.mock('@/hooks/useHybridMessages', () => ({
  useHybridMessages: (ctx: string) => ({
    threads: threadsLoading ? [] : [thread],
    isLoading: threadsLoading,
    isFetching: threadsLoading,
    context: ctx,
    markAllAsRead: vi.fn(),
    fetchThreads: vi.fn(),
  }),
}));
vi.mock('@/hooks/useChatGroupsAsThreads', () => ({
  useChatGroupsAsThreads: () => ({ threads: [], markGroupsReadLocal: vi.fn(), reload: vi.fn() }),
  isChatGroupThreadId: (id: string) => id.startsWith('chatgroup:'),
  chatGroupIdFromThreadId: (id: string) => id.replace('chatgroup:', ''),
}));
vi.mock('@/hooks/useChatUnreadCount', () => ({ useChatUnreadCount: () => ({ refresh: vi.fn() }) }));
vi.mock('@/hooks/useChatApi', () => ({ markGroupRead: vi.fn() }));
vi.mock('@/hooks/useUnreadSync', () => ({ useUnreadSync: () => undefined }));

import Messages from './Messages';

beforeAll(() => {
  if (typeof ResizeObserver === 'undefined') {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  }
});

beforeEach(() => {
  spotlightOn = false;
  mobile = false;
  threadsLoading = false;
  conversationProps.length = 0;
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/inbox']}>
      <Messages />
    </MemoryRouter>,
  );

describe('VTID-05110 Messages page — Spotlight switch', () => {
  it('flag off (desktop): the legacy desktop layout, no Spotlight frame', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'screens.messages.messages' })).toBeInTheDocument();
    expect(screen.getByTestId('conversation-view')).toHaveAttribute('data-thread', 't1');
  });

  it('flag on: ScreenFrame(conversation) around the same ConversationView with the same props', () => {
    renderPage();
    const legacyProps = Object.keys(conversationProps.at(-1)!).sort();
    conversationProps.length = 0;
    spotlightOn = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype="conversation"]')).not.toBeNull();
    expect(screen.getAllByTestId('conversation-view').at(-1)).toHaveAttribute('data-thread', 't1');
    const spotlightProps = conversationProps.at(-1)!;
    expect(Object.keys(spotlightProps).sort()).toEqual(legacyProps);
    expect(spotlightProps).toMatchObject({ threadId: 't1', context: 'global', className: 'flex-1 min-h-0 min-w-0' });
    expect(spotlightProps.onBack).toBeUndefined();
  });

  it('flag on while threads load: the conversation skeleton inside the frame, not the legacy loading page', () => {
    spotlightOn = true;
    threadsLoading = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype="conversation"]')).not.toBeNull();
    expect(container.querySelector('[data-archetype-skeleton="conversation"]')).not.toBeNull();
    expect(screen.queryByTestId('legacy-list-skeleton')).toBeNull();
  });

  it('phones never get the Spotlight frame', () => {
    mobile = true;
    spotlightOn = false; // useSpotlightEnabled() is always false on phones
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByTestId('mobile-row')).toHaveTextContent('Anna');
  });
});
