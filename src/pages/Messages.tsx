import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { messagesNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, MessageSquareText, Globe, Building, Plane, Search, MoreVertical, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationView from "@/components/messages/ConversationView";
import { ConversationErrorBoundary } from "@/components/messages/ConversationErrorBoundary";
import { useHybridMessages } from "@/hooks/useHybridMessages";
// VTID-03089: chat_groups appear in the unified /inbox list when in the
// global community context. Selecting one routes to /inbox/g/<id>.
import { useChatGroupsAsThreads, isChatGroupThreadId, chatGroupIdFromThreadId } from "@/hooks/useChatGroupsAsThreads";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";
import { markGroupRead } from "@/hooks/useChatApi";
import { useUnreadSync } from "@/hooks/useUnreadSync";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { MessageSquare } from "lucide-react";
import NewConversationPopup from "@/components/NewConversationPopup";
import ConversationListSkeleton from "@/components/messages/ConversationListSkeleton";
import EmptyStateIllustration from "@/components/messages/EmptyStateIllustration";
import ErrorMessage from "@/components/messages/ErrorMessage";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import CreateGroupPopup from "@/components/messages/CreateGroupPopup";
import TypingIndicator from '@/components/messages/TypingIndicator';
import PresenceIndicator from '@/components/messages/PresenceIndicator';
import GroupAvatarStack from '@/components/messages/GroupAvatarStack';
import { getConversationDisplayAvatar, getConversationDisplayTitle, getOtherParticipant } from '@/utils/conversationHelpers';
import ContactsTabContent from '@/components/contacts/ContactsTabContent';
import { CallManager } from '@/components/CallManager';
import { CallProvider } from '@/context/CallContext';
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { MobileConversationCard } from "@/components/messages/mobile/MobileConversationCard";
import { MobileInboxEmptyState } from "@/components/messages/mobile/MobileInboxEmptyState";
import { MobileConversationSkeleton } from "@/components/messages/mobile/MobileConversationSkeleton";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useTranslation } from "@/hooks/useTranslation";
import { t, notify, notifyError } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';

// Session-scoped memory of the last inbox view (context + open conversation)
// so navigating away (news feed, events, live rooms) and back restores the
// exact view instantly instead of re-running auto-selection from scratch.
// sessionStorage: per-tab, cleared when the browser session ends.
const INBOX_STATE_KEY = 'vitana.inbox.lastState';
function readInboxState(): { context?: 'global' | 'tenant'; threadId?: string | null } {
  try {
    return JSON.parse(sessionStorage.getItem(INBOX_STATE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export default function Messages() {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Always start in 'global' (Community) context — this is where conversations
  // live for all users regardless of role.  The user can switch to 'tenant'
  // (Network) via the mode pill.  Previously we auto-switched based on
  // currentRole, but that caused a deterministic empty-inbox bug: on
  // navigation-back the role is already cached as e.g. 'admin', so
  // messageContext initialized to 'tenant' whose query has no data, while
  // on full refresh the role loads async and the switch was accidentally
  // skipped via roleLoadedRef — making it look like refresh "fixed" it.
  // Restore the user's last explicit context choice for this tab session —
  // this is the user's own selection (mode pill), NOT the role-derived
  // auto-switch that caused the empty-inbox bug described above.
  const [messageContext, setMessageContext] = useState<'global' | 'tenant'>(
    () => (readInboxState().context === 'tenant' ? 'tenant' : 'global')
  );
  const { threads: apiThreads, isLoading, isFetching, context, ...hybridMessages } = useHybridMessages(messageContext);
  const isGlobalContext = context === 'global';

  // VTID-03089: merge chat_groups (new system) into the inbox list when in
  // the community/global context. Selecting one is intercepted below and
  // routed to /inbox/g/<id> instead of inline thread load.
  const { threads: chatGroupThreads, markGroupsReadLocal, reload: reloadChatGroups } = useChatGroupsAsThreads(isGlobalContext);
  const { refresh: refreshUnreadBadge } = useChatUnreadCount();
  const threads = useMemo(() => {
    if (!isGlobalContext) return apiThreads;
    return [...chatGroupThreads, ...apiThreads];
  }, [apiThreads, chatGroupThreads, isGlobalContext]);

  const userSelectedContextRef = React.useRef(false);
  // Desktop restores the conversation that was open when the user navigated
  // away (mobile is list-first by design, so it never restores a selection).
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return null;
    return readInboxState().threadId ?? null;
  });
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [pinnedThreads, setPinnedThreads] = useState<Set<string>>(new Set());
  const [conversationFilter, setConversationFilter] = useState<'all' | 'groups' | 'direct' | 'contacts'>('all');
  const [inboxSearchQuery, setInboxSearchQuery] = useState("");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const { pendingCount } = useAutopilot();

  const inboxModes: ModeOption[] = [
    { value: 'global', label: translate('inbox.contextTabs.community', 'Community'), icon: '🌐' },
    { value: 'tenant', label: translate('inbox.contextTabs.network', 'Network'), icon: '🏢' },
  ];

  // Parse query params + path segments to auto-select thread from notifications.
  // Path-based forms (/inbox/u/:recipientId, /inbox/t/:threadId) were added as
  // a follow-up to BOOTSTRAP-NOTIF-MESSENGER-DIAG because Appilix's Android
  // in-app browser silently fails on URLs with query strings. The query-param
  // form is kept for backward compatibility with legacy notifications and
  // bookmarks.
  const [searchParams, setSearchParams] = useSearchParams();
  const pathParams = useParams<{ recipientId?: string; threadId?: string; messageId?: string }>();
  const urlThreadId = pathParams.threadId || searchParams.get('thread');
  const urlRecipientId = pathParams.recipientId || searchParams.get('recipient');
  const urlContext = searchParams.get('context') as 'global' | 'tenant' | null;

  // Reaction notification deep-link: /inbox/u|t/:id/msg/:messageId. Captured
  // once into state (not read from the URL downstream) because the
  // thread/recipient effects below immediately navigate('/inbox', {replace}),
  // stripping the path segment before ConversationView could use it.
  const [deepLinkMessageId, setDeepLinkMessageId] = useState<string | null>(
    pathParams.messageId || null,
  );

  // ?thread= param OR /inbox/t/:threadId path (thread UUID)
  useEffect(() => {
    if (urlThreadId) {
      console.log('[Messages] Opening thread from URL:', { urlThreadId, urlContext });
      setSelectedThreadId(urlThreadId);
      setSelectedRecipientId(null);

      if (urlContext && (urlContext === 'global' || urlContext === 'tenant')) {
        setMessageContext(urlContext);
      }

      // Strip the deep-link from the URL so refreshes don't keep re-applying it.
      // For path-based deep-links we also navigate back to bare /inbox.
      if (pathParams.threadId) {
        navigate('/inbox', { replace: true });
      } else {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('thread');
        newParams.delete('context');
        setSearchParams(newParams, { replace: true });
      }
    }
  // pathParams.threadId is a primitive; including it triggers the strip exactly once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlThreadId, urlContext]);

  // BOOTSTRAP-NOTIF-DEEP-LINK: ?recipient= OR /inbox/u/:recipientId — user_id
  // from a chat notification. Store the recipient, set context, clear URL,
  // then resolve to a real thread once conversations load.
  const [pendingRecipient, setPendingRecipient] = useState<string | null>(null);

  useEffect(() => {
    if (urlRecipientId) {
      console.log('[Messages] Notification deep-link recipient:', urlRecipientId);
      setPendingRecipient(urlRecipientId);

      if (urlContext && (urlContext === 'global' || urlContext === 'tenant')) {
        setMessageContext(urlContext);
      }

      if (pathParams.recipientId) {
        navigate('/inbox', { replace: true });
      } else {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('recipient');
        newParams.delete('context');
        setSearchParams(newParams, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRecipientId, urlContext]);

  // Once threads load, resolve pendingRecipient → real thread UUID
  useEffect(() => {
    if (!pendingRecipient || threads.length === 0) return;
    const match = threads.find(t =>
      t.type === 'direct' && t.participants?.some((p: any) => p.user_id === pendingRecipient)
    );
    if (match) {
      console.log('[Messages] Resolved recipient', pendingRecipient, '→ thread', match.id);
      setSelectedThreadId(match.id);
      setSelectedRecipientId(pendingRecipient);
      setPendingRecipient(null);
    }
  }, [threads, pendingRecipient]);

  // Track optimistic unread updates (threadId -> 0)
  const [optimisticUnreadUpdates, setOptimisticUnreadUpdates] = useState<Record<string, number>>({});

  // SINGLE SOURCE OF TRUTH: Derive displayThreads from React Query threads + optimistic updates
  // Safety: if the server shows unread_count > 0 but we have an optimistic 0,
  // the server wins — a new message arrived after we set the override.
  const displayThreads = React.useMemo(() => {
    return threads.map(thread => {
      const optimistic = optimisticUnreadUpdates[thread.id];
      const real = thread.unread_count;
      // If optimistic is 0 but server says > 0, server wins (new msg arrived)
      const unread_count = (optimistic === 0 && real > 0) ? real : (optimistic ?? real);
      return { ...thread, unread_count };
    });
  }, [threads, optimisticUnreadUpdates]);

  // Total unread across all conversations — drives the "Mark all as read" enablement.
  const totalUnread = React.useMemo(
    () => displayThreads.reduce((sum, t) => sum + (t.unread_count || 0), 0),
    [displayThreads]
  );

  // Bulk "mark all as read" for the current context, honoring the active filter.
  const markAllAsRead = (hybridMessages as any).markAllAsRead as
    | ((filter?: 'all' | 'direct' | 'groups') => Promise<void>)
    | undefined;
  const handleMarkAllAsRead = useCallback(async () => {
    if (totalUnread === 0) return;
    const filter = conversationFilter === 'contacts' ? 'all' : conversationFilter;
    try {
      // 1. Direct DMs + legacy global threads (chat_messages + global_thread_participants).
      if (markAllAsRead) await markAllAsRead(filter);

      // 2. chat_groups (e.g. "FIRST 100") — a separate system that markAllAsRead
      //    doesn't cover. Clear each unread group via its own read endpoint.
      if (filter === 'all' || filter === 'groups') {
        const groupIds = displayThreads
          .filter((t) => isChatGroupThreadId(t.id) && (t.unread_count || 0) > 0)
          .map((t) => chatGroupIdFromThreadId(t.id));
        if (groupIds.length > 0) {
          markGroupsReadLocal(groupIds); // optimistic: clear the rows immediately
          await Promise.allSettled(groupIds.map((id) => markGroupRead(id)));
          reloadChatGroups(); // reconcile the group list from the backend
        }
      }

      // 3. Force the footer/sidebar badge to recompute now that DMs + groups are read.
      refreshUnreadBadge();
      notify('inbox.toast.allMarkedRead');
    } catch (err) {
      console.error('[inbox] mark all as read failed:', err);
      notifyError('inbox.toast.markAllReadFailed');
    }
  }, [markAllAsRead, totalUnread, conversationFilter, displayThreads, markGroupsReadLocal, reloadChatGroups, refreshUnreadBadge]);

  // Auto-select the most recent conversation (WhatsApp-style behavior)
  // Only auto-select on desktop - on mobile, users should see the list first and tap to open
  useEffect(() => {
    if (displayThreads.length > 0 && !selectedThreadId && !isMobile) {
      // VTID-03089: chat_group threads have their own /inbox/g/<id> page,
      // so they must not be picked up by the inline auto-selector — that
      // would re-trigger the standalone-route navigation and trap the user
      // in a "Loading group…" loop.
      const sortedThreads = [...displayThreads]
        .filter(t => !isChatGroupThreadId(t.id))
        .sort((a, b) => {
          const ap = pinnedThreads.has(a.id) ? 1 : 0;
          const bp = pinnedThreads.has(b.id) ? 1 : 0;
          if (ap !== bp) return bp - ap;
          const ad = new Date(a.updated_at).getTime();
          const bd = new Date(b.updated_at).getTime();
          return bd - ad;
        })
        .reduce((acc, thread) => {
          if (thread.type === 'direct') {
            const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
            const key = counterpart?.user_id || 'unknown';
            const existing = acc.find(t => t._dedupeKey === key);
            if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
              const filtered = acc.filter(t => t._dedupeKey !== key);
              filtered.push({ ...thread, _dedupeKey: key });
              return filtered;
            }
            return acc;
          } else {
            acc.push({ ...thread, _dedupeKey: thread.id });
            return acc;
          }
        }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[]);

      if (sortedThreads.length > 0) {
        setSelectedThreadId(sortedThreads[0].id);
        setSelectedRecipientId(null);
      }
    }
  }, [displayThreads, selectedThreadId, pinnedThreads, user?.id, isMobile]);

  // Remember the current view so returning to /inbox restores it instantly.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        INBOX_STATE_KEY,
        JSON.stringify({ context: messageContext, threadId: selectedThreadId })
      );
    } catch {
      /* private mode / storage full — restore is best-effort */
    }
  }, [messageContext, selectedThreadId]);

  // Reset selection when context changes. Skips the mount run — otherwise it
  // would immediately clear the selection just restored from sessionStorage.
  const contextMountedRef = React.useRef(false);
  useEffect(() => {
    if (!contextMountedRef.current) {
      contextMountedRef.current = true;
      return;
    }
    setSelectedThreadId(null);
    setSelectedRecipientId(null);
    setOptimisticUnreadUpdates({}); // Clear optimistic updates
    setInboxSearchQuery(""); // Reset search on context switch
  }, [messageContext]);

  // Handle real-time unread sync across tabs/devices - update optimistic state
  const handleThreadRead = useCallback((threadId: string, ctx: 'global' | 'tenant') => {
    console.log('📖 Messages.tsx: handleThreadRead called', { threadId, ctx, messageContext });
    if (ctx === messageContext) {
      setOptimisticUnreadUpdates(prev => ({
        ...prev,
        [threadId]: 0
      }));
    }
  }, [messageContext]);

  // Immediate optimistic unread update when conversation is opened
  const handleConversationOpened = useCallback((threadId: string) => {
    console.log('🚀 Messages.tsx: Conversation opened immediately', { threadId, messageContext });
    setOptimisticUnreadUpdates(prev => ({
      ...prev,
      [threadId]: 0
    }));
  }, []);

  // VTID-03089: chat_group threads open at their standalone /inbox/g/<id>
  // view instead of inline ConversationView. This must be branched at click
  // time — a post-hoc selectedThreadId interceptor created a back-button
  // loop with the desktop auto-select effect (FIRST 100 → auto-selected →
  // re-navigated → "Loading group…" loop).
  const handleThreadOpen = useCallback((thread: { id: string; unread_count?: number }) => {
    if (isChatGroupThreadId(thread.id)) {
      navigate(`/inbox/g/${chatGroupIdFromThreadId(thread.id)}`);
      return;
    }
    setSelectedThreadId(thread.id);
    setSelectedRecipientId(null);
    if ((thread.unread_count || 0) > 0) {
      handleConversationOpened(thread.id);
    }
  }, [navigate, handleConversationOpened]);

  // Search dropdown items for inbox search
  const searchDropdownItems = React.useMemo(() => {
    if (!inboxSearchQuery.trim()) return [];
    const query = inboxSearchQuery.toLowerCase();
    return displayThreads
      .filter(thread => {
        const title = getConversationDisplayTitle(thread, user?.id).toLowerCase();
        const lastMsg = (thread.last_message?.content || '').toLowerCase();
        return title.includes(query) || lastMsg.includes(query);
      })
      .slice(0, 6)
      .map(thread => ({
        id: thread.id,
        title: getConversationDisplayTitle(thread, user?.id),
        subtitle: thread.last_message?.content
          ? thread.last_message.content.length > 60
            ? thread.last_message.content.slice(0, 60) + '…'
            : thread.last_message.content
          : undefined,
      }));
  }, [displayThreads, inboxSearchQuery, user?.id]);

  const handleSearchItemClick = useCallback((threadId: string) => {
    const thread = displayThreads.find(t => t.id === threadId);
    handleThreadOpen({ id: threadId, unread_count: thread?.unread_count });
  }, [displayThreads, handleThreadOpen]);

  // Move the just-sent conversation to the top instantly via React Query cache
  const handleMessageSent = useCallback((threadId: string, newMessage: any, ctx: 'global' | 'tenant') => {
    // The hooks already update the React Query cache optimistically
    // No need for local state manipulation
    console.log('📨 Messages.tsx: Message sent', { threadId, ctx });
  }, []);

  const handleUnreadChange = useCallback((threadId: string, ctx: 'global' | 'tenant') => {
    if (ctx === messageContext) {
      // Clear optimistic override so the real unread_count shows through
      setOptimisticUnreadUpdates(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    }
  }, [messageContext]);

  // Initialize unread sync
  useUnreadSync(handleThreadRead, handleUnreadChange);

  const handleConversationCreated = (threadId: string, recipientId: string) => {
    setSelectedThreadId(threadId);
    // Keep recipientId until participants are loaded so header shows the name
    setSelectedRecipientId(recipientId);
  };

  const handleGroupCreated = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedRecipientId(null);
  };

  // Hide ORB only when actively inside a direct chat (chat is text-only).
  // The inbox list view keeps the Orb visible.
  useEffect(() => {
    if (isMobile && selectedThreadId) {
      document.body.dataset.chatScreenOpen = "true";
      return () => { delete document.body.dataset.chatScreenOpen; };
    }
  }, [isMobile, selectedThreadId]);

  // Show skeleton when loading/fetching AND no cached data
  if ((isLoading || isFetching) && threads.length === 0) {
    // Mobile loading state
    if (isMobile) {
      return (
        <AppLayout>
          <SEO title={translate('inbox.title')} description={translate('inbox.description')} canonical={window.location.href} />
          <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
            <div className="p-4 pb-32 space-y-4">
              <StandardHeader 
                title={translate('inbox.title')}
                description={translate('inbox.description')}
              />
              <MobileConversationSkeleton count={6} />
            </div>
          </div>
        </AppLayout>
      );
    }
    
    // Desktop loading state
    return (
      <>
        <SEO title={translate('inbox.desktopTitle', 'Messages')} description={translate('inbox.description')} canonical={window.location.href} />
        <AppLayout>
          <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
            <SubNavigation items={messagesNavigation} />
            <div className="flex-1 min-h-0 overflow-hidden p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
              <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col gap-2">
                <div className="pt-1">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{translate('inbox.desktopTitle', 'Messages')}</h1>
                  <p className="text-sm text-muted-foreground">{translate('inbox.loading')}</p>
                </div>
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  <div className="w-80 border-r overflow-hidden">
                    <ConversationListSkeleton />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">{translate('inbox.loading')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </>
    );
  }

  // Get responsive panel sizes based on screen size
  const getConversationPanelSize = () => {
    if (isMobile) return 100; // Full width on mobile
    return 43; // 43% on desktop - ensures full card content incl. rounded corners
  };

  const getChatPanelSize = () => {
    if (isMobile) return 0; // Hidden on mobile when conversation list is shown
    return 57; // 57% on desktop - chat remains wider
  };

  const getFilteredThreads = (threadsList: typeof displayThreads, filter: typeof conversationFilter) => {
    if (filter === 'all') return threadsList;
    if (filter === 'groups') return threadsList.filter(t => t.type === 'group');
    if (filter === 'direct') return threadsList.filter(t => t.type === 'direct');
    return [];
  };

  const renderConversationList = (threadsList: typeof displayThreads) => {
    const filteredThreads = getFilteredThreads(threadsList, conversationFilter);

    return (
      <Tabs value={conversationFilter} onValueChange={(v) => setConversationFilter(v as any)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto mb-4">
          <TabsTrigger 
            value="all" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.all')}
          </TabsTrigger>
          <TabsTrigger 
            value="groups" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.groups')}
          </TabsTrigger>
          <TabsTrigger 
            value="direct" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.direct')}
          </TabsTrigger>
          <TabsTrigger 
            value="contacts" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.contacts')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <EmptyStateIllustration 
                type="inbox"
                context={messageContext}
                threads={threadsList}
                onAction={() => setShowNewConversation(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .reduce((acc, thread) => {
                  if (thread.type === 'direct') {
                    const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
                    const key = counterpart?.user_id || 'unknown';
                    const existing = acc.find(t => t._dedupeKey === key);
                    if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
                      const filtered = acc.filter(t => t._dedupeKey !== key);
                      filtered.push({ ...thread, _dedupeKey: key });
                      return filtered;
                    }
                    return acc;
                  } else {
                    acc.push({ ...thread, _dedupeKey: thread.id });
                    return acc;
                  }
                }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[])
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => {
                        console.log('🎯 Messages.tsx: Thread clicked', { threadId: thread.id, unreadCount: thread.unread_count });
                        handleThreadOpen(thread);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <ClickableAvatar
                            userId={thread.type !== 'group' ? getOtherParticipant(thread, user?.id)?.user_id : undefined}
                            src={getConversationDisplayAvatar(thread, user?.id) || undefined}
                            fallback={getConversationDisplayTitle(thread, user?.id)?.[0]?.toUpperCase() || '?'}
                            alt={getConversationDisplayTitle(thread, user?.id)}
                            className={densityMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}
                            disabled={thread.type === 'group'}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator 
                              userId={getOtherParticipant(thread, user?.id)?.user_id || ''} 
                              context={context}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                  {getConversationDisplayTitle(thread, user?.id)}
                                </h3>
                                {isPinned && (
                                  <div className="w-2 h-2 bg-domain-messages-accent rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.body}
                                </p>
                              )}
                              
                              {densityMode === 'comfortable' && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Users className="w-3 h-3 mr-1" />{t('screens.messages.value0Participants', { value0: thread.participants?.length || 0 })}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className={`text-muted-foreground whitespace-nowrap ${
                                densityMode === 'compact' ? 'text-xs' : 'text-xs'
                              }`}>
                                {thread.updated_at && fmtDate(new Date(thread.updated_at), {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          {/* Create Group Header - only show when groups exist */}
          {filteredThreads.length > 0 && (
            <div className="mb-4 mr-3">
              <Button 
                onClick={() => setShowCreateGroup(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('screens.messages.createNewGroup')}
              </Button>
            </div>
          )}

          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('screens.messages.noGroupsYet2')}</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  {t('screens.messages.groupsHelpYouCollaborateWithMultiple')}
                </p>
                <Button onClick={() => setShowCreateGroup(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  {t('screens.messages.createYourFirstGroup2')}
                </Button>
              </div>
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  
                  // Show unread groups before read groups
                  const au = (a.unread_count || 0) > 0 ? 1 : 0;
                  const bu = (b.unread_count || 0) > 0 ? 1 : 0;
                  if (au !== bu) return bu - au;
                  
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => handleThreadOpen(thread)}
                    >
                      <div className="flex items-start space-x-3">
                        {thread.avatar_url ? (
                          <Avatar className={densityMode === 'compact' ? 'h-8 w-8' : 'h-10 w-10'}>
                            <AvatarImage src={thread.avatar_url} alt={thread.name || ''} className="object-cover" />
                            <AvatarFallback>
                              <Users className="w-4 h-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <GroupAvatarStack
                            participants={thread.participants || []}
                            size={densityMode === 'compact' ? 'sm' : 'md'}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                  {thread.name || 'Unnamed Group'}
                                </h3>
                                {isPinned && (
                                  <div className="w-2 h-2 bg-domain-messages-accent rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.sender_id !== user?.id && thread.last_message.sender_id && (
                                    <span className="font-medium">
                                      {thread.participants?.find(p => p.user_id === thread.last_message.sender_id)?.display_name || 'Someone'}
                                      :{' '}
                                    </span>
                                  )}
                                  {thread.last_message.body}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{t('screens.messages.value0Members', { value0: thread.participants?.length || 0 })}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {thread.updated_at && fmtDate(new Date(thread.updated_at), {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="direct" className="mt-0">
          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('screens.messages.noDirectMessages')}</h3>
                <p className="text-muted-foreground mb-4">{t('screens.messages.startConversationWithSomeone')}</p>
                <Button onClick={() => setShowNewConversation(true)}>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  {t('screens.messages.newMessage')}
                </Button>
              </div>
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .reduce((acc, thread) => {
                  const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
                  const key = counterpart?.user_id || 'unknown';
                  const existing = acc.find(t => t._dedupeKey === key);
                  if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
                    const filtered = acc.filter(t => t._dedupeKey !== key);
                    filtered.push({ ...thread, _dedupeKey: key });
                    return filtered;
                  }
                  return acc;
                }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[])
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => handleThreadOpen(thread)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className={densityMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}>
                            {/* loading=lazy + decoding=async: defers HTTP fetch + image decode
                                for off-viewport threads in long inboxes; native browser support,
                                no behavior change for visible avatars (~125% viewport threshold). */}
                            <AvatarImage
                              src={getConversationDisplayAvatar(thread, user?.id)}
                              loading="lazy"
                              decoding="async"
                            />
                            <AvatarFallback>
                              {getConversationDisplayTitle(thread, user?.id)?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator 
                              userId={getOtherParticipant(thread, user?.id)?.user_id || ''} 
                              context={context}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                {getConversationDisplayTitle(thread, user?.id)}
                              </h3>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.body}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {thread.updated_at && fmtDate(new Date(thread.updated_at), {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-0">
          <ContactsTabContent 
            onStartConversation={(userId) => {
              // Create or navigate to DM with this user
              setSelectedRecipientId(userId);
              setShowNewConversation(true);
            }}
            messageContext={messageContext}
          />
        </TabsContent>
      </Tabs>
    );
  };

  const renderConversationContent = () => {
    // Mobile layout - stack conversations and chat
    if (isMobile) {
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!selectedThreadId ? (
            // Show conversation list on mobile
            <div className="h-full min-h-0 flex flex-col bg-card/50 backdrop-blur-sm">
              <ScrollArea className="h-full flex-1 min-h-0">
                <div className="p-4 pr-12">
                  {renderConversationList(displayThreads)}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Show chat view on mobile
            <div className="h-full bg-background/95 backdrop-blur-sm min-w-0 flex flex-col min-h-0 overflow-hidden">
              <ConversationErrorBoundary>
                <ConversationView
                  threadId={selectedThreadId}
                  recipientId={selectedRecipientId}
                  context={messageContext}
                  className="flex-1 min-h-0 min-w-0"
                  onBack={() => setSelectedThreadId(null)}
                  onThreadRead={handleThreadRead}
                  onConversationOpened={handleConversationOpened}
                  onMessageSent={handleMessageSent}
                  onGroupCreated={handleGroupCreated}
                  initialScrollMessageId={deepLinkMessageId}
                  onInitialMessageScrolled={() => setDeepLinkMessageId(null)}
                />
              </ConversationErrorBoundary>
            </div>
          )}
        </div>
      );
    }

    // Desktop layout - resizable panels
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
          {/* Conversation List Panel */}
          <ResizablePanel 
            defaultSize={getConversationPanelSize()} 
            minSize={27} 
            maxSize={50}
            className="transition-all duration-300 min-w-0 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="h-full min-h-0 flex flex-col border-r bg-card/50 backdrop-blur-sm">
              <ScrollArea className="h-full min-h-0">
                <div className="p-4 pr-12">
                  {renderConversationList(displayThreads)}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          {/* Chat Area Panel */}
          <ResizablePanel 
            defaultSize={getChatPanelSize()}
            minSize={50}
            className="transition-all duration-300 min-w-0 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="h-full bg-background/95 backdrop-blur-sm min-w-0 flex flex-col min-h-0 overflow-hidden">
              {selectedThreadId || selectedRecipientId ? (
                <ConversationErrorBoundary>
                  <ConversationView
                    threadId={selectedThreadId}
                    recipientId={selectedRecipientId}
                    context={messageContext}
                    className="flex-1 min-h-0 min-w-0"
                    onThreadRead={handleThreadRead}
                    onConversationOpened={handleConversationOpened}
                    onMessageSent={handleMessageSent}
                    onGroupCreated={handleGroupCreated}
                    initialScrollMessageId={deepLinkMessageId}
                    onInitialMessageScrolled={() => setDeepLinkMessageId(null)}
                  />
                </ConversationErrorBoundary>
              ) : (
                <div className="h-full flex items-center justify-center px-4 py-4">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">{t('screens.messages.selectConversation')}</h3>
                    <p className="text-muted-foreground">{t('screens.messages.chooseConversationFromLeftStartMessaging')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  };

  const renderMobileConversationList = () => {
    const filteredThreads = getFilteredThreads(displayThreads, conversationFilter);

    // Apply search filter
    const searchFiltered = inboxSearchQuery.trim()
      ? filteredThreads.filter(thread => {
          const name = getConversationDisplayTitle(thread, user?.id) || '';
          const lastMsg = (thread as any).last_message?.body || '';
          const q = inboxSearchQuery.toLowerCase();
          return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
        })
      : filteredThreads;
    
    if (searchFiltered.length === 0 && inboxSearchQuery.trim()) {
      return (
        <div className="text-center py-12">
          <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{t('screens.messages.noConversationsMatchingInboxsearchquery', { inboxSearchQuery })}</p>
        </div>
      );
    }

    if (searchFiltered.length === 0) {
      return (
        <MobileInboxEmptyState 
          context={messageContext}
          onNewMessage={() => setShowNewConversation(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      );
    }

    // Sort and dedupe threads (use searchFiltered to respect search query)
    const sortedThreads = [...searchFiltered]
      .sort((a, b) => {
        const ap = pinnedThreads.has(a.id) ? 1 : 0;
        const bp = pinnedThreads.has(b.id) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const ad = new Date(a.updated_at).getTime();
        const bd = new Date(b.updated_at).getTime();
        return bd - ad;
      })
      .reduce((acc, thread) => {
        if (thread.type === 'direct') {
          const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
          const key = counterpart?.user_id || 'unknown';
          const existing = acc.find(t => t._dedupeKey === key);
          if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
            const filtered = acc.filter(t => t._dedupeKey !== key);
            filtered.push({ ...thread, _dedupeKey: key });
            return filtered;
          }
          return acc;
        } else {
          acc.push({ ...thread, _dedupeKey: thread.id });
          return acc;
        }
      }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[]);

    return (
      <div className="space-y-2">
        {sortedThreads.map((thread) => (
          <MobileConversationCard
            key={thread.id}
            id={thread.id}
            name={getConversationDisplayTitle(thread, user?.id) || 'Unknown'}
            avatarUrl={getConversationDisplayAvatar(thread, user?.id) || undefined}
            lastMessage={thread.last_message?.body}
            timestamp={thread.updated_at}
            unreadCount={thread.unread_count || 0}
            isActive={selectedThreadId === thread.id}
            isPinned={pinnedThreads.has(thread.id)}
            isGroup={thread.type === 'group'}
            participantUserId={getOtherParticipant(thread, user?.id)?.user_id}
            context={messageContext}
            onClick={() => handleThreadOpen(thread)}
          />
        ))}
      </div>
    );
  };


  // Mobile Layout - matches Events/Wallet/BusinessHub pattern
  if (isMobile) {
    return (
      <CallProvider userId={user?.id || ''} userName={user?.email || 'User'}>
        <AppLayout>
          <SEO title={t('screens.messages.inbox')} description="Your conversations, updates, and notifications" canonical={window.location.href} />
          
          <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
            {/* When viewing a conversation, show full-screen chat */}
            {selectedThreadId ? (
              <div className="fixed inset-0 z-[55] flex min-h-0 flex-col overflow-hidden bg-background">
                <ConversationErrorBoundary>
                  <ConversationView
                    threadId={selectedThreadId}
                    recipientId={selectedRecipientId}
                    context={messageContext}
                    className="flex-1 min-h-0 min-w-0"
                    onBack={() => setSelectedThreadId(null)}
                    onThreadRead={handleThreadRead}
                    onConversationOpened={handleConversationOpened}
                    onMessageSent={handleMessageSent}
                    onGroupCreated={handleGroupCreated}
                    initialScrollMessageId={deepLinkMessageId}
                    onInitialMessageScrolled={() => setDeepLinkMessageId(null)}
                  />
                </ConversationErrorBoundary>
              </div>
            ) : (
              /* Inbox list view */
              <div className="p-4 pb-32 space-y-3">
                {/* StandardHeader */}
                <StandardHeader
                  title={translate('inbox.title')}
                  description={translate('inbox.description')}
                />
                
                {/* Action Rail */}
                <UtilityActionButton 
                  compact
                  className="min-w-0"
                  afterGiftVoucherChildren={
                    <>
                      <VitanaIndexChip />
                      <AutopilotChip pendingCount={pendingCount} onClick={() => setAutopilotOpen(true)} />
                    </>
                  }
                >
                  <div className="flex items-center gap-2 min-w-max">
                    <ExpandableSearchButton 
                      placeholder={translate('inbox.searchPlaceholder')}
                      onSearch={(query) => setInboxSearchQuery(query)}
                      onClear={() => setInboxSearchQuery("")}
                      dropdownItems={searchDropdownItems}
                      onItemClick={handleSearchItemClick}
                    />
                    <MobileModePill
                      modes={inboxModes}
                      activeMode={messageContext}
                      onModeChange={(v) => { userSelectedContextRef.current = true; setMessageContext(v as 'global' | 'tenant'); }}
                    />
                    <UniversalCalendarButton />
                    
                    {/* New Message button */}
                    <Button 
                      onClick={() => setShowNewConversation(true)}
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">{translate('inbox.actions.new')}</span>
                    </Button>
                  </div>
                </UtilityActionButton>
                
                {/* Sub-filter pills + overflow menu */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {['all', 'direct', 'groups'].map((filter) => (
                      <Button
                        key={filter}
                        variant={conversationFilter === filter ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setConversationFilter(filter as any)}
                        className={`h-8 px-3 rounded-full shrink-0 text-sm ${
                          conversationFilter === filter
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60'
                        }`}
                      >
                        {translate(`inbox.tabs.${filter}`)}
                      </Button>
                    ))}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full shrink-0"
                        aria-label={translate('inbox.actions.menu')}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={totalUnread === 0} onClick={handleMarkAllAsRead}>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        {translate('inbox.actions.markAllRead')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {renderMobileConversationList()}
              </div>
            )}
          </div>

          {/* Popups */}
          <NewConversationPopup
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
            onConversationCreated={handleConversationCreated}
            onGroupCreated={handleGroupCreated}
            context={messageContext}
          />
          
          <CreateGroupPopup
            open={showCreateGroup}
            onOpenChange={setShowCreateGroup}
            onGroupCreated={handleGroupCreated}
            context={messageContext}
          />
          
          <AutopilotPopup 
            open={autopilotOpen} 
            onOpenChange={setAutopilotOpen} 
          />

          {user?.id && (
            <CallManager userId={user.id} userName={user.email || 'User'} />
          )}
        </AppLayout>
      </CallProvider>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <CallProvider userId={user?.id || ''} userName={user?.email || 'User'}>
      <AppLayout>
        <SEO title={t('screens.messages.messages')} description="Your messages and conversations" canonical={window.location.href} />
        <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
          <SubNavigation items={messagesNavigation} />
          <div className="flex-1 min-h-0 overflow-hidden p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
            <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col gap-2">
          <div className="pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('screens.messages.messages')}</h1>
            <p className="text-sm text-muted-foreground">{t('screens.messages.connectWithYourCommunityProfessionalNetwork')}</p>
          </div>
          {/* Utility Action Button */}
          <UtilityActionButton>
            <ExpandableSearchButton
              placeholder={t('screens.messages.searchConversationsPeopleGroups')}
              onSearch={(query) => setInboxSearchQuery(query)}
              onClear={() => setInboxSearchQuery("")}
              dropdownItems={searchDropdownItems}
              onItemClick={handleSearchItemClick}
            />
            <UniversalCalendarButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('screens.messages.new')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNewConversation(true)}>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  {t('screens.messages.newMessage')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  {t('screens.messages.createGroup')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={translate('inbox.actions.menu')}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={totalUnread === 0} onClick={handleMarkAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {translate('inbox.actions.markAllRead')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={messageContext} onValueChange={(value: string) => { userSelectedContextRef.current = true; setMessageContext(value as 'global' | 'tenant'); }} className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <SplitBarList>
            <SplitBarTrigger value="global">
              {t('screens.messages.globalCommunity')}
            </SplitBarTrigger>
            <SplitBarTrigger value="tenant">
              {t('screens.messages.professionalNetwork')}
            </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="global" className="mt-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 data-[state=active]:overflow-hidden">
              {renderConversationContent()}
            </SplitBarContent>

            <SplitBarContent value="tenant" className="mt-0 data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 data-[state=active]:overflow-hidden">
              {renderConversationContent()}
            </SplitBarContent>
          </SplitBar>
            </div>
          </div>
        </div>

      <NewConversationPopup
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleConversationCreated}
        onGroupCreated={handleGroupCreated}
        context={messageContext}
      />
      
      <CreateGroupPopup
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={handleGroupCreated}
        context={messageContext}
      />
      
        {user?.id && (
          <CallManager userId={user.id} userName={user.email || 'User'} />
        )}
      </AppLayout>
    </CallProvider>
  );
}
