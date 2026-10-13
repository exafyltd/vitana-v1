/**
 * VTID-05110 — Messages Spotlight: conversation archetype (list column +
 * thread stage), the legacy list order, selection, filters, states, and the
 * page's own thread view rendered unchanged inside the stage.
 *
 * Layout only: nothing here types into a composer or sends a message.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
  getI18nLocale: () => 'de-DE',
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header data-testid="header">{p.title}</header> }));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: React.ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => <button type="button">calendar</button> }));
vi.mock('@/components/ui/expandable-search-button', () => ({
  ExpandableSearchButton: (p: { onItemClick?: (id: string) => void; dropdownItems?: { id: string; title: string }[] }) => (
    <div data-testid="search">
      {p.dropdownItems?.map((i) => (
        <button key={i.id} type="button" onClick={() => p.onItemClick?.(i.id)}>
          {`result-${i.title}`}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/components/messages/PresenceIndicator', () => ({ default: (p: { userId: string }) => <span data-presence={p.userId} /> }));
vi.mock('@/components/messages/EmptyStateIllustration', () => ({
  default: (p: { onAction?: () => void }) => (
    <button type="button" onClick={p.onAction}>
      empty-inbox
    </button>
  ),
}));

import { ScreenFrame } from '@/components/layout/spotlight';
import { MessagesSpotlight, type MessagesSpotlightProps } from './MessagesSpotlight';
import { fillHeight } from './useFillViewport';
import type { InboxThreadLike } from '@/components/ui/vcard/adapters/thread';

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

const me = 'me';
const threads: InboxThreadLike[] = [
  { id: 't-old', type: 'direct', updated_at: '2026-10-01T10:00:00Z', participants: [{ user_id: me }, { user_id: 'anna', display_name: 'Anna' }] },
  {
    id: 't-anna',
    type: 'direct',
    updated_at: '2026-10-05T10:00:00Z',
    unread_count: 2,
    participants: [{ user_id: me }, { user_id: 'anna', display_name: 'Anna' }],
    last_message: { body: 'Bis morgen', sender_id: 'anna' },
  },
  { id: 'g1', type: 'group', name: 'Lauftreff', updated_at: '2026-10-03T10:00:00Z', participants: [{ user_id: me }, { user_id: 'x', display_name: 'Xena' }] },
];

function setup(over: Partial<MessagesSpotlightProps<InboxThreadLike>> = {}) {
  const props: MessagesSpotlightProps<InboxThreadLike> = {
    context: 'global',
    onContextChange: vi.fn(),
    loading: false,
    threads,
    currentUserId: me,
    pinnedThreadIds: new Set(),
    selectedThreadId: 't-anna',
    filter: 'all',
    onFilterChange: vi.fn(),
    onThreadOpen: vi.fn(),
    totalUnread: 2,
    onMarkAllRead: vi.fn(),
    onNewMessage: vi.fn(),
    onCreateGroup: vi.fn(),
    searchItems: [],
    onSearch: vi.fn(),
    onClearSearch: vi.fn(),
    onSearchItemClick: vi.fn(),
    thread: <div data-testid="conversation-view">thread</div>,
    contacts: <div data-testid="contacts">contacts</div>,
    children: ({ frame, stage }) => (
      <ScreenFrame archetype="conversation" {...frame}>
        {stage}
      </ScreenFrame>
    ),
    ...over,
  };
  const utils = render(
    <MemoryRouter>
      <MessagesSpotlight {...props} />
    </MemoryRouter>,
  );
  return { props, ...utils };
}

const listOf = () => screen.getByRole('region', { name: 'spotlightMedia.messages.listLabel' });

describe('VTID-05110 Messages Spotlight', () => {
  it('is a conversation screen: existing chrome, context tabs, list column and thread stage', () => {
    const { container } = setup();
    expect(container.querySelector('[data-archetype="conversation"]')).not.toBeNull();
    expect(screen.getByTestId('subnav')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((el) => el.textContent)).toEqual([
      'screens.messages.globalCommunity',
      'screens.messages.professionalNetwork',
    ]);
    expect(listOf()).toBeInTheDocument();
    expect(within(container.querySelector('[data-thread-stage]') as HTMLElement).getByTestId('conversation-view')).toBeInTheDocument();
    expect(container.querySelector('[data-vcard-size="spotlight"]')).toBeNull();
  });

  it('lists threads as row cards in the legacy order with one direct thread per member', () => {
    setup();
    const rows = listOf().querySelectorAll('[data-vcard-size="row"]');
    expect(Array.from(rows).map((r) => r.getAttribute('data-thread-id'))).toEqual(['t-anna', 'g1']);
    expect(rows[0]).toHaveTextContent('Anna');
    expect(rows[0]).toHaveTextContent('Bis morgen');
    expect(within(rows[0] as HTMLElement).getByLabelText(/spotlightMedia\.messages\.unread/)).toHaveTextContent('2');
  });

  it('marks the open thread and opens another through the page handler', () => {
    const { props } = setup();
    expect(screen.getByRole('button', { name: 'Anna' })).toHaveAttribute('aria-current', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Lauftreff' }));
    expect(props.onThreadOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }));
  });

  it('filters, contacts and the context switch go through the page state', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByTestId('inbox-filter-groups'));
    expect(props.onFilterChange).toHaveBeenCalledWith('groups');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'screens.messages.professionalNetwork' }));
    expect(props.onContextChange).toHaveBeenCalledWith('tenant');
    rerender(
      <MemoryRouter>
        <MessagesSpotlight {...props} filter="contacts" />
      </MemoryRouter>,
    );
    expect(within(listOf()).getByTestId('contacts')).toBeInTheDocument();
  });

  it('a search result opens its thread through the page handler', () => {
    const { props } = setup({ searchItems: [{ id: 'g1', title: 'Lauftreff' }] });
    fireEvent.click(screen.getByText('result-Lauftreff'));
    expect(props.onSearchItemClick).toHaveBeenCalledWith('g1');
  });

  it('no open thread shows the select prompt; no threads shows the inbox empty state', () => {
    const { props } = setup({ thread: null, threads: [] });
    expect(screen.getByText('screens.messages.selectConversation')).toBeInTheDocument();
    fireEvent.click(screen.getByText('empty-inbox'));
    expect(props.onNewMessage).toHaveBeenCalled();
  });

  it('loading shows the conversation skeleton inside the frame, never a spinner', () => {
    const { container } = setup({ loading: true });
    expect(container.querySelector('[data-archetype-skeleton="conversation"]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('[data-conversation-layout]')).toBeNull();
  });

  it('the list and thread fill the viewport below the chrome (composer stays on screen)', () => {
    const { container } = setup();
    const layout = container.querySelector('[data-conversation-layout]') as HTMLElement;
    expect(layout.style.height).toMatch(/^\d+px$/);
  });

  it('fillHeight leaves the viewport below the element, with a floor', () => {
    expect(fillHeight(250, 900, 48, 420)).toBe(602);
    expect(fillHeight(700, 900, 48, 420)).toBe(420);
  });
});
