import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState } from 'react';

export interface GroupPost {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data: any;
  created_at: string;
  // Joined
  author_name?: string;
  author_avatar?: string;
}

/**
 * Unified group feed hook that reads/writes from global_messages
 * via the group's chat_thread_id. This ensures messages posted
 * on the group card appear in the Messenger chat and vice versa.
 */
export function useGroupPosts(groupId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatThreadId, setChatThreadId] = useState<string | null>(null);

  // Step 1: Resolve chat_thread_id for this group
  const threadQuery = useQuery({
    queryKey: ['group-chat-thread', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const { data, error } = await supabase
        .from('global_community_groups')
        .select('chat_thread_id')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data?.chat_thread_id || null;
    },
    enabled: !!groupId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (threadQuery.data) setChatThreadId(threadQuery.data);
  }, [threadQuery.data]);

  // Step 2: Fetch messages from global_messages for this thread
  const postsQuery = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      if (!chatThreadId) return [];
      const { data, error } = await supabase
        .from('global_messages')
        .select('*')
        .eq('thread_id', chatThreadId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Enrich with author profiles
      const userIds = [...new Set((data || []).map(m => m.sender_id))];
      if (userIds.length === 0) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      if (profilesError) {
        console.error('[useGroupPosts] Failed to load author profiles:', profilesError);
      }

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data || []).map(msg => ({
        id: msg.id,
        thread_id: msg.thread_id,
        sender_id: msg.sender_id,
        body: msg.body || '',
        message_type: msg.message_type || 'text',
        content_data: msg.content_data,
        created_at: msg.created_at,
        author_name: profileMap.get(msg.sender_id)?.display_name || 'Unknown',
        author_avatar: profileMap.get(msg.sender_id)?.avatar_url || undefined,
      })) as GroupPost[];
    },
    enabled: !!groupId && !!chatThreadId,
    staleTime: 15_000,
  });

  // Step 3: Realtime subscription for live updates
  useEffect(() => {
    if (!chatThreadId) return;

    const channel = supabase
      .channel(`group-feed-${chatThreadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_messages',
          filter: `thread_id=eq.${chatThreadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'global_messages',
          filter: `thread_id=eq.${chatThreadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatThreadId, groupId, queryClient]);

  // Step 4: Create post → insert into global_messages
  const createPost = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!user?.id || !chatThreadId) throw new Error('Not authenticated or no thread');
      const { data, error } = await supabase
        .from('global_messages')
        .insert({
          thread_id: chatThreadId,
          sender_id: user.id,
          body: content,
          message_type: 'text',
        })
        .select()
        .single();
      if (error) throw error;

      // Update thread timestamp so Messenger inbox sorts correctly
      await supabase
        .from('global_message_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatThreadId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['global-threads'] });
      queryClient.invalidateQueries({ queryKey: ['global-messages', chatThreadId] });
    },
  });

  // Step 5: Delete post → delete from global_messages
  const deletePost = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('global_messages').delete().eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['global-threads'] });
      queryClient.invalidateQueries({ queryKey: ['global-messages', chatThreadId] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading || threadQuery.isLoading,
    createPost,
    deletePost,
    chatThreadId,
  };
}
