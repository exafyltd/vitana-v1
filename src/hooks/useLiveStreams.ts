import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  stream_type: string;
  tags: string[];
  access_level: string;
  cover_image_url: string | null;
  co_hosts: string[];
  scheduled_for: string | null;
  status: 'pending' | 'live' | 'ended' | 'cancelled';
  enable_chat: boolean;
  enable_polls: boolean;
  enable_replay: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  total_messages: number;
  metadata: any;
  creator_display_name?: string | null;
  creator_avatar_url?: string | null;
}

export function useScheduledStreams() {
  return useQuery({
    queryKey: ['live-streams', 'scheduled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .select('*')
        .eq('status', 'pending')
        .not('scheduled_for', 'is', null)
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((stream: any) => ({
        ...stream,
        creator_display_name: null,
        creator_avatar_url: null,
      })) as LiveStream[];
    },
  });
}

export function useLiveStreams() {
  return useQuery({
    queryKey: ['live-streams', 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((stream: any) => ({
        ...stream,
        creator_display_name: null,
        creator_avatar_url: null,
      })) as LiveStream[];
    },
    refetchInterval: 30000,
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamData: any) => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .insert([streamData])
        .select()
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useUpdateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LiveStream> }) => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useCancelStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .update({ status: 'cancelled' })
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useStartStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .update({ 
          status: 'live',
          started_at: new Date().toISOString()
        })
        .eq('id', streamId)
        .select()
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useEndStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useDeleteStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .delete()
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}
