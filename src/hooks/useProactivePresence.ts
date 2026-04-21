/**
 * Companion Phase H.1 — Welcome-Back Banner (VTID-01948)
 *
 * Fetches /api/v1/presence/welcome and maps the response into a
 * UI-ready banner state. Honors the pacer (backend returns should_show=false
 * when pause is active, daily cap is reached, or user dismissed today).
 *
 * Dismissal is persisted to localStorage AND round-tripped to the backend
 * so the pacer can enforce the cross-channel silence window.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://gateway-q74ibpv6ia-uc.a.run.app/api/v1';

export type WelcomeVariant = 'urgent' | 'warm' | 'engage' | 'inform';

export interface WelcomeBannerData {
  should_show: boolean;
  copy: string;
  cta_url: string | null;
  variant: WelcomeVariant;
  reason_tag: string;
  bucket: string;
  days_since_last: number;
}

const DISMISS_KEY_PREFIX = 'vitana.welcome_banner.dismissed_at:';

function dismissedTodayLocal(userId: string | null): boolean {
  if (!userId) return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${userId}`);
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return false;
    const ageMs = Date.now() - ts;
    return ageMs < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function useWelcomeBanner(): {
  banner: WelcomeBannerData | null;
  isLoading: boolean;
  acknowledge: () => void;
  dismiss: () => void;
} {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['welcome-banner', user?.id],
    queryFn: async (): Promise<WelcomeBannerData | null> => {
      if (!user) return null;
      if (dismissedTodayLocal(user.id)) return null;

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return null;

      const res = await fetch(`${GATEWAY_URL}/presence/welcome`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok || !json.should_show) return null;
      return json as WelcomeBannerData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // re-check every 5 minutes at most
    refetchOnWindowFocus: false,
  });

  const ackMutation = useMutation({
    mutationFn: async (action: 'acknowledged' | 'dismissed') => {
      if (!user) return;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      await fetch(`${GATEWAY_URL}/presence/welcome/ack`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      }).catch(() => {});
    },
  });

  const acknowledge = () => {
    ackMutation.mutate('acknowledged');
    // Keep hidden for the session after CTA tap — server already logged it.
    if (user) {
      try {
        localStorage.setItem(`${DISMISS_KEY_PREFIX}${user.id}`, new Date().toISOString());
      } catch {}
    }
    qc.setQueryData(['welcome-banner', user?.id], null);
  };

  const dismiss = () => {
    ackMutation.mutate('dismissed');
    if (user) {
      try {
        localStorage.setItem(`${DISMISS_KEY_PREFIX}${user.id}`, new Date().toISOString());
      } catch {}
    }
    qc.setQueryData(['welcome-banner', user?.id], null);
  };

  return {
    banner: query.data || null,
    isLoading: query.isLoading,
    acknowledge,
    dismiss,
  };
}
