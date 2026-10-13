import * as React from 'react';
import { CheckCheck, MessageSquare, MessageSquareText, MoreVertical, Plus, Users } from 'lucide-react';
import { ArchetypeSkeleton, type ScreenFrameProps } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { ExpandableSearchButton, type SearchDropdownItem } from '@/components/ui/expandable-search-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import PresenceIndicator from '@/components/messages/PresenceIndicator';
import EmptyStateIllustration from '@/components/messages/EmptyStateIllustration';
import { messagesNavigation } from '@/config/navigation';
import { fmtDate } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import {
  orderThreadsForList,
  threadCounterpartId,
  threadToVCard,
  type InboxListFilter,
  type InboxThreadLike,
} from '@/components/ui/vcard/adapters/thread';
import { useFillViewport } from './useFillViewport';

/**
 * VTID-05110 — Messages (/inbox, /inbox/u/…, /inbox/t/…) on the Spotlight
 * design: archetype `conversation` = list column + thread stage
 * (docs/design-system/SPOTLIGHT_RULES.md).
 *
 * Layout only. Messages.tsx keeps every hook — useHybridMessages, the chat
 * group merge, unread sync, the keep-alive caches, deep-link resolution,
 * auto-select, session restore — and hands this component the derived list,
 * the selection and the callbacks. The open thread is the page's own
 * <ConversationView>, passed in as `thread`, so sending, realtime, typing and
 * read receipts are exactly the legacy desktop's. Desktop only, behind
 * useSpotlightEnabled(); phones never render this.
 */
export type InboxContext = 'global' | 'tenant';

export interface MessagesSpotlightProps<T extends InboxThreadLike> {
  context: InboxContext;
  onContextChange: (context: InboxContext) => void;
  /** First load (no cached threads yet) or an unresolved notification deep link. */
  loading: boolean;
  threads: T[];
  currentUserId?: string;
  pinnedThreadIds: ReadonlySet<string>;
  selectedThreadId: string | null;
  filter: InboxListFilter;
  onFilterChange: (filter: InboxListFilter) => void;
  onThreadOpen: (thread: T) => void;

  totalUnread: number;
  onMarkAllRead: () => void;
  onNewMessage: () => void;
  onCreateGroup: () => void;

  searchItems: SearchDropdownItem[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onSearchItemClick: (threadId: string) => void;

  /** The page's <ConversationView> for the open thread, or null for none. */
  thread: React.ReactNode | null;
  /** The page's contacts list (Contacts filter). */
  contacts: React.ReactNode;

  /**
   * The page composes the chrome itself (contract SR-03):
   * `{({ frame, stage }) => <ScreenFrame archetype="conversation" {...frame}>{stage}</ScreenFrame>}`.
   */
  children: (parts: ConversationFrameParts) => React.ReactElement;
}

/** Everything ScreenFrame needs except the archetype, which the page names. */
export interface ConversationFrameParts {
  frame: Omit<ScreenFrameProps, 'archetype' | 'children'>;
  stage: React.ReactNode;
}

const FILTERS: InboxListFilter[] = ['all', 'direct', 'groups', 'contacts'];

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-5 text-primary-foreground"
      aria-label={t('spotlightMedia.messages.unread', { count })}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ThreadAvatar({ thread, title, src, presenceUserId, context }: {
  thread: InboxThreadLike;
  title: string;
  src: string | null;
  presenceUserId?: string;
  context: InboxContext;
}) {
  // Direct chats: the avatar links to the member's profile, as in the legacy
  // list (VTID-04992). It sits above the row's stretched open-thread button.
  if (thread.type !== 'group' && presenceUserId) {
    return (
      <div className="relative z-10 h-full w-full">
        <ClickableAvatar
          userId={presenceUserId}
          src={src ?? undefined}
          fallback={title.charAt(0).toUpperCase() || '?'}
          alt={t('spotlightMedia.messages.openProfile', { name: title })}
          className="h-full w-full rounded-md"
          loading="lazy"
        />
        <div className="absolute bottom-0.5 end-0.5">
          <PresenceIndicator userId={presenceUserId} context={context} size="sm" />
        </div>
      </div>
    );
  }
  return (
    <Avatar className="h-full w-full rounded-md">
      {src && <AvatarImage src={src} alt="" loading="lazy" decoding="async" className="object-cover" />}
      <AvatarFallback className="rounded-md bg-muted text-sm font-semibold text-muted-foreground">
        {thread.type === 'group' ? <Users className="h-5 w-5" aria-hidden="true" /> : title.charAt(0).toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

export function MessagesSpotlight<T extends InboxThreadLike>(props: MessagesSpotlightProps<T>) {
  const {
    context,
    onContextChange,
    loading,
    threads,
    currentUserId,
    pinnedThreadIds,
    selectedThreadId,
    filter,
    onFilterChange,
    onThreadOpen,
    totalUnread,
    onMarkAllRead,
    onNewMessage,
    onCreateGroup,
    searchItems,
    onSearch,
    onClearSearch,
    onSearchItemClick,
    thread,
    contacts,
    children: renderFrame,
  } = props;

  const layoutRef = React.useRef<HTMLDivElement>(null);
  useFillViewport(layoutRef, !loading);

  const ordered = React.useMemo(
    () => orderThreadsForList(threads, filter, pinnedThreadIds, currentUserId),
    [threads, filter, pinnedThreadIds, currentUserId],
  );
  const untitled = t('spotlightMedia.messages.untitled');

  const renderEmpty = () => {
    if (filter === 'groups') {
      return (
        <I18nEmptyState
          Icon={Users}
          titleKey="screens.messages.noGroupsYet2"
          descriptionKey="screens.messages.groupsHelpYouCollaborateWithMultiple"
          actionKey="screens.messages.createYourFirstGroup2"
          onAction={onCreateGroup}
        />
      );
    }
    if (filter === 'direct') {
      return (
        <I18nEmptyState
          Icon={MessageSquareText}
          titleKey="screens.messages.noDirectMessages"
          descriptionKey="screens.messages.startConversationWithSomeone"
          actionKey="screens.messages.newMessage"
          onAction={onNewMessage}
        />
      );
    }
    return <EmptyStateIllustration type="inbox" context={context} threads={threads} onAction={onNewMessage} onCreateGroup={onCreateGroup} />;
  };

  const list =
    filter === 'contacts' ? (
      <div className="p-3">{contacts}</div>
    ) : ordered.length === 0 ? (
      <div className="p-3">{renderEmpty()}</div>
    ) : (
      <ul className="flex flex-col gap-1.5 p-3" data-inbox-list="">
        {filter === 'groups' && (
          <li>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onCreateGroup}>
              <Plus className="h-4 w-4" />
              {t('screens.messages.createNewGroup')}
            </Button>
          </li>
        )}
        {ordered.map((item) => {
          const card = threadToVCard(item, currentUserId, untitled);
          const active = selectedThreadId === item.id;
          const pinned = pinnedThreadIds.has(item.id);
          return (
            <VCard
              key={card.key}
              as="li"
              size="row"
              focused={active}
              data-thread-id={item.id}
              className={cn('relative transition-colors hover:bg-muted/50', active && 'bg-accent')}
              mediaSlot={
                <ThreadAvatar
                  thread={item}
                  title={card.title}
                  src={card.media?.src ?? null}
                  presenceUserId={threadCounterpartId(item, currentUserId)}
                  context={context}
                />
              }
              title={
                <button
                  type="button"
                  className="text-start after:absolute after:inset-0 after:rounded-vcard-sm focus-visible:outline-none"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onThreadOpen(item)}
                >
                  {card.title}
                </button>
              }
              meta={card.meta}
              badge={
                <div className="flex flex-col items-end gap-1">
                  {item.updated_at && (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(new Date(item.updated_at), { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    {pinned && (
                      <span className="h-2 w-2 rounded-full bg-primary" role="img" aria-label={t('spotlightMedia.messages.pinned')} />
                    )}
                    <UnreadBadge count={item.unread_count || 0} />
                  </div>
                </div>
              }
            />
          );
        })}
      </ul>
    );

  const frame: ConversationFrameParts['frame'] = {
    subNav: { items: messagesNavigation },
    header: { title: t('screens.messages.messages'), description: t('screens.messages.connectWithYourCommunityProfessionalNetwork') },
    utility: {
      children: (
        <>
          <ExpandableSearchButton
            placeholder={t('screens.messages.searchConversationsPeopleGroups')}
            onSearch={onSearch}
            onClear={onClearSearch}
            dropdownItems={searchItems}
            onItemClick={onSearchItemClick}
          />
          <UniversalCalendarButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('screens.messages.new')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onNewMessage}>
                <MessageSquareText className="me-2 h-4 w-4" />
                {t('screens.messages.newMessage')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateGroup}>
                <Users className="me-2 h-4 w-4" />
                {t('screens.messages.createGroup')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('inbox.actions.menu')}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={totalUnread === 0} onClick={onMarkAllRead}>
                <CheckCheck className="me-2 h-4 w-4" />
                {t('inbox.actions.markAllRead')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ),
    },
    tabs: {
      value: context,
      onValueChange: (v) => onContextChange(v === 'tenant' ? 'tenant' : 'global'),
      items: [
        { value: 'global', label: t('screens.messages.globalCommunity') },
        { value: 'tenant', label: t('screens.messages.professionalNetwork') },
      ],
      ariaLabel: t('spotlightMedia.messages.contextLabel'),
    },
  };

  const stage = loading ? (
    <ArchetypeSkeleton archetype="conversation" />
  ) : (
    <div ref={layoutRef} className="flex min-h-0 gap-4" data-conversation-layout="">
      <section
        aria-label={t('spotlightMedia.messages.listLabel')}
        className="flex min-h-0 w-96 shrink-0 flex-col overflow-hidden rounded-vcard border bg-card"
      >
        <div className="flex flex-wrap gap-1.5 border-b p-3" role="group" aria-label={t('spotlightMedia.messages.filterLabel')}>
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'ghost'}
              className={cn('h-8 rounded-full px-3', filter !== f && 'bg-muted/60')}
              aria-pressed={filter === f}
              data-testid={`inbox-filter-${f}`}
              onClick={() => onFilterChange(f)}
            >
              {t(`inbox.tabs.${f}`)}
            </Button>
          ))}
        </div>
        <ScrollArea className="min-h-0 flex-1">{list}</ScrollArea>
      </section>
      <section
        aria-label={t('spotlightMedia.messages.threadLabel')}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-vcard border bg-card"
        data-thread-stage=""
      >
        {thread ?? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t('screens.messages.selectConversation')}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{t('spotlightMedia.messages.selectDesc')}</p>
          </div>
        )}
      </section>
    </div>
  );

  return renderFrame({ frame, stage });
}
