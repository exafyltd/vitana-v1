/**
 * Did-You-Know Tour — silent-fallback card hook (BOOTSTRAP-DYK-TOUR)
 *
 * Mirrors useProactivePresence (Welcome banner) for the new DYK surface.
 * Backend (GET /api/v1/presence/did-you-know) does all eligibility logic —
 * frontend just renders + wires CTA / dismiss / pause.
 *
 * Plan: .claude/plans/proactive-did-you-generic-sifakis.md (vitana-platform)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://gateway-q74ibpv6ia-uc.a.run.app/api/v1';

export type DykPillarLink =
  | 'Physical' | 'Mental' | 'Nutritional' | 'Social' | 'Environmental' | 'Prosperity'
  | 'meta';

export interface DykTipPayload {
  should_show: boolean;
  tip_key: string;
  feature_key: string;
  index_pillar_link: DykPillarLink;
  card_copy: string;
  cta_label: string;
  cta_url: string;
  voice_opener: string;
  voice_confirm: string;
  voice_on_nav: string;
  active_usage_days: number;
}

export type DykDeclineScope = 'tip' | 'today' | 'stop';

const SESSION_HIDE_KEY_PREFIX = 'vitana.dyk_card.hidden_session:';

function hiddenThisSessionLocal(userId: string | null): boolean {
  if (!userId) return false;
  try {
    return sessionStorage.getItem(`${SESSION_HIDE_KEY_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

function setHiddenThisSession(userId: string): void {
  try {
    sessionStorage.setItem(`${SESSION_HIDE_KEY_PREFIX}${userId}`, '1');
  } catch {}
}

export function useDidYouKnowTip(): {
  tip: DykTipPayload | null;
  isLoading: boolean;
  accept: () => string | null;
  decline: (scope: DykDeclineScope) => void;
} {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['dyk-tip', user?.id],
    queryFn: async (): Promise<DykTipPayload | null> => {
      if (!user) return null;
      if (hiddenThisSessionLocal(user.id)) return null;

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return null;

      const res = await fetch(`${GATEWAY_URL}/presence/did-you-know`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok || !json.should_show) return null;
      return json as DykTipPayload;
    },
    enabled: !!user,
    // Re-fetch occasionally; pacer dedupes server-side.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async (tip: DykTipPayload) => {
      if (!user) return;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      await fetch(`${GATEWAY_URL}/presence/did-you-know/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tip_key: tip.tip_key, channel: 'card' }),
      }).catch(() => {});
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ tip, scope }: { tip: DykTipPayload; scope: DykDeclineScope }) => {
      if (!user) return;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      await fetch(`${GATEWAY_URL}/presence/did-you-know/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tip_key: tip.tip_key, scope, channel: 'card' }),
      }).catch(() => {});
    },
  });

  const accept = (): string | null => {
    const tip = query.data;
    if (!tip || !user) return null;
    acceptMutation.mutate(tip);
    setHiddenThisSession(user.id);
    qc.setQueryData(['dyk-tip', user.id], null);
    return tip.cta_url;
  };

  const decline = (scope: DykDeclineScope) => {
    const tip = query.data;
    if (!tip || !user) return;
    declineMutation.mutate({ tip, scope });
    setHiddenThisSession(user.id);
    qc.setQueryData(['dyk-tip', user.id], null);
  };

  return {
    tip: query.data || null,
    isLoading: query.isLoading,
    accept,
    decline,
  };
}
