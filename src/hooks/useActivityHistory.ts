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
  'calendar.respond': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Response' },
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
    case 'calendar.respond':
      return `Responded to event: ${activity_data.response}`;
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

      // Fetch ai_messages (chat history) - only if no filter or filter matches
      if (!filterType || filterType === 'all' || filterType === 'chat') {
        promises.push(
          supabase
            .from("ai_messages")
            .select("*")
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1)
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

      // Transform ai_messages
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

      // Merge and sort by timestamp
      const activities = [...messageActivities, ...logActivities]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        activities,
        nextPage: activities.length === ITEMS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Flatten all pages into single array
  const activities = data?.pages.flatMap((page) => page.activities) || [];

  if (error) {
    toast({
      title: "Error loading activity history",
      description: error.message,
      variant: "destructive",
    });
  }

  return {
    activities,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}
