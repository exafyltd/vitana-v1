/**
 * Companion Phase H.2 — Awareness-driven Priority of the Day (VTID-01947-UI)
 *
 * Fetches /api/v1/presence/priority and maps the response into a UI-ready
 * DailyPriority-shaped object that PriorityOfDayBanner can render without
 * restructuring.
 *
 * Returns null when:
 *   - The endpoint is suppressed (active proactive pause)
 *   - The fetch fails
 *   - User is not yet authenticated
 * In those cases, PriorityOfDayBanner falls back to the existing
 * deterministic useDailyPriority hook.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Heart, Target, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://gateway-q74ibpv6ia-uc.a.run.app/api/v1';

export type ProactiveVariant = 'urgent' | 'warm' | 'engage' | 'inform';

export interface ProactivePriority {
  message: string;
  actionText: string;
  actionLink: string;
  icon: any;
  color: string;
  reason_tag: string;
  variant: ProactiveVariant;
  suppressed: boolean;
}

const VARIANT_VISUAL: Record<ProactiveVariant, { icon: any; color: string }> = {
  urgent: {
    icon: AlertCircle,
    color: 'from-red-500/15 via-orange-500/15 to-red-500/15',
  },
  warm: {
    icon: Heart,
    color: 'from-pink-500/15 via-rose-500/15 to-pink-500/15',
  },
  engage: {
    icon: Target,
    color: 'from-violet-500/15 via-purple-500/15 to-violet-500/15',
  },
  inform: {
    icon: Lightbulb,
    color: 'from-yellow-500/15 via-amber-500/15 to-yellow-500/15',
  },
};

export function useProactivePriority(): {
  priority: ProactivePriority | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['proactive-priority', user?.id],
    queryFn: async (): Promise<ProactivePriority | null> => {
      if (!user) return null;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return null;

      const res = await fetch(`${GATEWAY_URL}/presence/priority`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok) return null;

      // Suppressed (pause active) — let caller fall back
      if (json.suppressed) {
        return null;
      }

      const variant: ProactiveVariant = (json.variant || 'inform') as ProactiveVariant;
      const visual = VARIANT_VISUAL[variant] || VARIANT_VISUAL.inform;

      return {
        message: json.message,
        actionText: '', // backend message is self-contained; avoid duplication
        actionLink: json.cta_url || '/',
        icon: visual.icon,
        color: visual.color,
        reason_tag: json.reason_tag || '',
        variant,
        suppressed: false,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes — priority shouldn't rebuild on every Home visit
    refetchOnWindowFocus: false,
  });

  return {
    priority: query.data || null,
    isLoading: query.isLoading,
    refetch: () => query.refetch(),
  };
}
