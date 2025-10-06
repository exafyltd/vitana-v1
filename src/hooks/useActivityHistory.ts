import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActivityHistoryItem {
  id: string;
  content: string;
  activityType: 'conversation';
  role: 'user' | 'assistant';
  createdAt: string;
  metadata?: any;
  conversationId?: string;
}

const ITEMS_PER_PAGE = 20;

export function useActivityHistory() {
  const { toast } = useToast();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["activity-history"],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Fetch ONLY ai_messages (conversation history)
      const { data: messages, error: messagesError } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("role", "user") // Only user messages for cleaner activity view
        .order("created_at", { ascending: false })
        .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

      if (messagesError) throw messagesError;

      const activities: ActivityHistoryItem[] = (messages || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        activityType: 'conversation' as const,
        role: msg.role as 'user' | 'assistant',
        createdAt: msg.created_at,
        metadata: msg.metadata,
        conversationId: msg.conversation_id,
      }));

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
