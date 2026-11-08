/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the sharing data layer: the native twins
 * of the web hooks `useCampaigns`, `useDistributionPosts`, `useCampaignActions`, `useScheduledPosts`,
 * `useChannels` and `usePostAnalytics` (class B: they import the web Supabase client, so they are
 * re-implemented here on the app's own client — same tables, same columns, same filters and
 * writes). Success toasts use the web's catalog keys; a failed write raises the generic error toast
 * (the web interpolates the raw error text into English, which has no catalog key).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { notify, notifyError } from '../../../ports/ui';
import type { AnalyticsRow, CampaignRow, ChannelRow, PostRow } from '../rules';

const sb = () => getSupabase() as any;

async function currentUserId(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data?.user) throw new Error('Not authenticated');
  return data.user.id as string;
}

const fail = () => notifyError('errors.somethingWentWrong');

// ── campaigns ────────────────────────────────────────────────────────────
export type CampaignInput = Partial<Omit<CampaignRow, 'id'>> & { name: string };

export function useCampaigns() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await sb().from('campaigns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['campaigns'] });

  const create = useMutation({
    mutationFn: async (campaign: CampaignInput) => {
      const { data, error } = await sb().from('campaigns').insert(campaign).select().single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.campaignCreatedSuccessfully');
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignRow> & { id: string }) => {
      const { data, error } = await sb().from('campaigns').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.campaignUpdated');
    },
    onError: fail,
  });

  const setStatus = (status: 'active' | 'paused' | 'completed', toastKey: string) =>
    useMutation({
      mutationFn: async (id: string) => {
        const { data, error } = await sb().from('campaigns').update({ status }).eq('id', id).select().single();
        if (error) throw error;
        return data as CampaignRow;
      },
      onSuccess: () => {
        void refresh();
        notify(toastKey);
      },
      onError: fail,
    });
  // eslint-disable-next-line react-hooks/rules-of-hooks -- three fixed calls, in the same order every render
  const activate = setStatus('active', 'toasts.hooks.campaignActivated');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const pause = setStatus('paused', 'toasts.hooks.campaignPaused');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const complete = setStatus('completed', 'toasts.hooks.campaignCompletedSuccessfully');

  const duplicate = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: original, error: fetchError } = await sb().from('campaigns').select('*').eq('id', campaignId).single();
      if (fetchError) throw fetchError;
      const copy = {
        name: `${original.name} (Copy)`,
        description: original.description,
        status: 'draft',
        start_date: original.start_date,
        end_date: original.end_date,
        target_channels: original.target_channels,
        distribution_config: original.distribution_config,
        user_id: original.user_id,
      };
      const { data, error } = await sb().from('campaigns').insert(copy).select().single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.campaignDuplicatedSuccessfullyNewDraftCreated');
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.campaignDeleted');
    },
    onError: fail,
  });

  return {
    campaigns: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createCampaign: create,
    updateCampaign: update,
    activateCampaign: activate,
    pauseCampaign: pause,
    completeCampaign: complete,
    duplicateCampaign: duplicate,
    deleteCampaign: remove,
  };
}

// ── distribution posts ───────────────────────────────────────────────────
export type PostInput = {
  user_id: string;
  title: string;
  content: string;
  description: string;
  entity_type: string;
  channels: string[];
  status: 'draft';
  campaign_id: string | null;
};

export function useDistributionPosts() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['distribution_posts'],
    queryFn: async (): Promise<PostRow[]> => {
      const { data, error } = await sb().from('distribution_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PostRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['distribution_posts'] });

  const createPost = useMutation({
    mutationFn: async (post: PostInput) => {
      const { data, error } = await sb().from('distribution_posts').insert(post).select().single();
      if (error) throw error;
      return data as PostRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.postCreatedSuccessfully');
    },
    onError: fail,
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PostRow> }) => {
      const { data, error } = await sb().from('distribution_posts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as PostRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.postUpdatedSuccessfully');
    },
    onError: fail,
  });

  const blastNow = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await sb()
        .from('distribution_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', postId)
        .select()
        .single();
      if (error) throw error;
      return data as PostRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.blastingNow');
    },
    onError: fail,
  });

  return { posts: query.data, isLoading: query.isLoading, createPost, updatePost, blastNow };
}

/** `useCampaignActions.activateAllPosts`: publishes every draft of the campaign and asks `distribute-post` to send each. */
export function useActivateAllPosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: posts, error: fetchError } = await sb().from('distribution_posts').select('id').eq('campaign_id', campaignId).eq('status', 'draft');
      if (fetchError) throw fetchError;
      if (!posts || posts.length === 0) throw new Error('No draft posts to activate');
      const { error: updateError } = await sb()
        .from('distribution_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('status', 'draft');
      if (updateError) throw updateError;
      const results = await Promise.all(posts.map((post: { id: string }) => sb().functions.invoke('distribute-post', { body: { postId: post.id } })));
      const failed = results.filter((r: { error?: unknown }) => r.error).length;
      return { activated: posts.length as number, failed };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['distribution_posts'] });
    },
    onError: fail,
  });
}

// ── scheduled posts ──────────────────────────────────────────────────────
export interface ScheduledRow {
  id: string;
  post_id: string;
  status: string;
  scheduled_for: string;
  channels: string[] | null;
  distribution_posts: PostRow | null;
}

export function useScheduledPosts() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['scheduled_posts'],
    queryFn: async (): Promise<ScheduledRow[]> => {
      const { data, error } = await sb().from('scheduled_posts').select('*, distribution_posts(*)').eq('status', 'pending').order('scheduled_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduledRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['scheduled_posts'] });

  const schedulePost = useMutation({
    mutationFn: async (input: { post_id: string; user_id: string; scheduled_for: string; channels: string[] }) => {
      await sb().from('distribution_posts').update({ status: 'scheduled', scheduled_for: input.scheduled_for }).eq('id', input.post_id);
      const { data, error } = await sb().from('scheduled_posts').insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void refresh();
      void qc.invalidateQueries({ queryKey: ['distribution_posts'] });
      notify('toasts.hooks.postScheduledSuccessfully');
    },
    onError: fail,
  });

  const setStatus = (status: 'cancelled' | 'paused' | 'pending', toastKey: string) =>
    useMutation({
      mutationFn: async (scheduledId: string) => {
        const { error } = await sb().from('scheduled_posts').update({ status }).eq('id', scheduledId);
        if (error) throw error;
      },
      onSuccess: () => {
        void refresh();
        notify(toastKey);
      },
      onError: fail,
    });
  /* eslint-disable react-hooks/rules-of-hooks -- three fixed calls, in the same order every render */
  const cancelScheduled = setStatus('cancelled', 'toasts.hooks.scheduledPostCancelled');
  const pauseScheduled = setStatus('paused', 'toasts.hooks.scheduledPostPaused');
  const resumeScheduled = setStatus('pending', 'toasts.hooks.scheduledPostResumed');
  /* eslint-enable react-hooks/rules-of-hooks */

  return { scheduledPosts: query.data, isLoading: query.isLoading, schedulePost, cancelScheduled, pauseScheduled, resumeScheduled };
}

// ── channels ─────────────────────────────────────────────────────────────
export function useChannels() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['distribution_channels'],
    queryFn: async (): Promise<ChannelRow[]> => {
      const { data, error } = await sb().from('distribution_channels').select('*').order('channel_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelRow[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['distribution_channels'] });

  const connectChannel = useMutation({
    mutationFn: async (input: { channel_type: string; channel_name: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await sb()
        .from('distribution_channels')
        .insert({ user_id, channel_type: input.channel_type, channel_name: input.channel_name, is_connected: true, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data as ChannelRow;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.channelConnectedSuccessfully');
    },
    onError: fail,
  });

  const disconnectChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await sb().from('distribution_channels').update({ is_connected: false }).eq('id', channelId);
      if (error) throw error;
    },
    onSuccess: () => {
      void refresh();
      notify('toasts.hooks.channelDisconnected');
    },
    onError: fail,
  });

  return { channels: query.data, isLoading: query.isLoading, isError: query.isError, connectChannel, disconnectChannel };
}

// ── analytics ────────────────────────────────────────────────────────────
export function usePostAnalytics() {
  return useQuery({
    queryKey: ['post_analytics'],
    queryFn: async (): Promise<AnalyticsRow[]> => {
      const { data, error } = await sb().from('post_analytics').select('*, distribution_posts(title)').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnalyticsRow[];
    },
  });
}

export { currentUserId };
