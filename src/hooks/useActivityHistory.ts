import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActivityHistoryItem {
  id: string;
  content: string;
  activityType: 
    | 'conversation'
    | 'chat.message'
    | 'memory.create' | 'memory.update' | 'memory.delete' | 'memory.promote'
    | 'wallet.transfer' | 'wallet.exchange'
    | 'discover.view' | 'discover.like' | 'discover.match'
    | 'calendar.create' | 'calendar.update' | 'calendar.respond';
  role?: 'user' | 'assistant';
  createdAt: string;
  metadata?: any;
  conversationId?: string;
  activityData?: any;
  contextData?: any;
  icon?: string;
  tagColor?: string;
}

export interface ConversationExchange {
  id: string;
  userMessage: ActivityHistoryItem;
  assistantMessage?: ActivityHistoryItem;
  conversationId: string;
  createdAt: string;
}


export const ACTIVITY_TYPE_CONFIG: Record<string, { icon: string; tagColor: string; label: string }> = {
  'conversation': { icon: '💬', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Conversation' },
  'chat.message': { icon: '💬', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Chat' },
  'memory.create': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Created' },
  'memory.update': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Updated' },
  'memory.delete': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Deleted' },
  'memory.promote': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Promoted to Knowledge' },
  'wallet.transfer': { icon: '💰', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Transfer' },
  'wallet.exchange': { icon: '💰', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Exchange' },
  'discover.view': { icon: '🔍', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'Profile Viewed' },
  'discover.like': { icon: '❤️', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'Liked' },
  'discover.match': { icon: '❤️', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'New Match' },
  'calendar.create': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Created' },
  'calendar.update': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Updated' },
  'calendar.delete': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Deleted' },
  'calendar.respond': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Response' },
  'autopilot.action.select': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Selected' },
  'autopilot.action.execute': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Executed' },
  'autopilot.action.dismiss': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Dismissed' },
};

function formatActivityContent(log: any): string {
  const { activity_type, activity_data } = log;
  
  switch (activity_type) {
    case 'memory.create':
      return `Created knowledge: "${activity_data.content?.substring(0, 100)}..."`;
    case 'memory.update':
      return `Updated knowledge: "${activity_data.content?.substring(0, 100)}..."`;
    case 'memory.delete':
      return `Deleted knowledge item`;
    case 'memory.promote':
      return `Promoted activity to knowledge base`;
    case 'wallet.transfer':
      return `Transferred ${activity_data.amount} ${activity_data.currency} to another user`;
    case 'wallet.exchange':
      return `Exchanged ${activity_data.amount} ${activity_data.from_currency} → ${activity_data.to_currency}`;
    case 'discover.view':
      return `Viewed a profile`;
    case 'discover.like':
      return `Liked a profile`;
    case 'discover.match':
      return `New match with compatibility score ${activity_data.compatibility_score}%`;
    case 'calendar.create':
      return `Created event: ${activity_data.title}`;
    case 'calendar.update':
      return `Updated event: ${activity_data.title}`;
    case 'calendar.delete':
      return `Deleted event: ${activity_data.title}`;
    case 'calendar.respond':
      return `Responded to event: ${activity_data.response}`;
    case 'autopilot.action.select':
      return `Selected autopilot action: ${activity_data.title}`;
    case 'autopilot.action.execute':
      return `Executed: ${activity_data.title}`;
    case 'autopilot.action.dismiss':
      return `Dismissed autopilot suggestion`;
    default:
      return 'Activity recorded';
  }
}

const ITEMS_PER_PAGE = 20;

export function useActivityHistory(filterType?: string) {
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["activity-history", filterType],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const promises = [];

      // Fetch ai_messages (chat history) - fetch BOTH user and assistant messages
      if (!filterType || filterType === 'all' || filterType === 'chat') {
        promises.push(
          supabase
            .from("ai_messages")
            .select("*")
            .order("created_at", { ascending: false })
            .range(pageParam * ITEMS_PER_PAGE * 2, (pageParam + 1) * ITEMS_PER_PAGE * 2 - 1) // Fetch more to account for pairs
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      // Fetch user_activity_log
      let logQuery = supabase
        .from("user_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

      // Apply filter if specified
      if (filterType && filterType !== 'all' && filterType !== 'chat') {
        logQuery = logQuery.like("activity_type", `${filterType}.%`);
      }

      promises.push(logQuery);

      const [messagesResult, logsResult] = await Promise.all(promises);

      if (messagesResult.error) throw messagesResult.error;
      if (logsResult.error) throw logsResult.error;

      // Transform ai_messages into activities
      const messageActivities: ActivityHistoryItem[] = (messagesResult.data || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        activityType: 'conversation' as const,
        role: msg.role as 'user' | 'assistant',
        createdAt: msg.created_at,
        metadata: msg.metadata,
        conversationId: msg.conversation_id,
        icon: ACTIVITY_TYPE_CONFIG['conversation'].icon,
        tagColor: ACTIVITY_TYPE_CONFIG['conversation'].tagColor,
      }));

      // Group messages by conversation_id to create Q&A pairs
      const conversationMap = new Map<string, { user?: ActivityHistoryItem; assistant?: ActivityHistoryItem }>();
      
      messageActivities.forEach((msg) => {
        if (!msg.conversationId) return;
        
        const existing = conversationMap.get(msg.conversationId) || {};
        if (msg.role === 'user') {
          existing.user = msg;
        } else if (msg.role === 'assistant') {
          existing.assistant = msg;
        }
        conversationMap.set(msg.conversationId, existing);
      });

      // Convert to ConversationExchange array
      const conversationExchanges: ConversationExchange[] = [];
      conversationMap.forEach((pair, conversationId) => {
        if (pair.user) {
          conversationExchanges.push({
            id: pair.user.id,
            userMessage: pair.user,
            assistantMessage: pair.assistant,
            conversationId,
            createdAt: pair.user.createdAt,
          });
        }
      });

      // Transform user_activity_log
      const logActivities: ActivityHistoryItem[] = (logsResult.data || []).map((log) => ({
        id: log.id,
        content: formatActivityContent(log),
        activityType: log.activity_type,
        createdAt: log.created_at,
        activityData: log.activity_data,
        contextData: log.context_data,
        icon: ACTIVITY_TYPE_CONFIG[log.activity_type]?.icon || '📌',
        tagColor: ACTIVITY_TYPE_CONFIG[log.activity_type]?.tagColor || 'bg-gray-100 dark:bg-gray-800',
      }));

      return {
        conversationExchanges,
        logActivities,
        nextPage: (conversationExchanges.length + logActivities.length) >= ITEMS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Flatten all pages into arrays
  const conversationExchanges = data?.pages.flatMap((page) => page.conversationExchanges) || [];
  const logActivities = data?.pages.flatMap((page) => page.logActivities) || [];

  // Merge and sort all items by timestamp for display
  const allItems = [
    ...conversationExchanges.map(ex => ({ ...ex, itemType: 'exchange' as const })),
    ...logActivities.map(log => ({ ...log, itemType: 'activity' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (error) {
    toast({
      title: "Error loading activity history",
      description: error.message,
      variant: "destructive",
    });
  }

  return {
    allItems,
    conversationExchanges,
    logActivities,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}
