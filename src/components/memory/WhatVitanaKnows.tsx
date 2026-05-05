/**
 * Companion Phase H.6 — What Vitana Knows About Me (VTID-01951)
 *
 * User-facing preview of the awareness signals Vitana sees. Builds trust
 * by making the "black box" visible. Read-only v1; edit/forget link to
 * existing Memory + Settings flows.
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Edit3, Pause, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://gateway-q74ibpv6ia-uc.a.run.app/api/v1';

interface AwarenessItem {
  kind: string;
  label: string;
  value: string;
  source: string;
}

interface SelfAwarenessResponse {
  ok: boolean;
  items: AwarenessItem[];
  last_refreshed_at: string;
  user_controls: {
    edit_memory_url: string;
    pause_proactivity_url: string;
  };
}

export function WhatVitanaKnows() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<SelfAwarenessResponse | null>({
    queryKey: ['self-awareness-summary', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return null;

      const res = await fetch(`${GATEWAY_URL}/presence/self-awareness-summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      return (await res.json()) as SelfAwarenessResponse;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data?.ok || !data.items?.length) return null;

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          What Vitana remembers about you
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {data.items.map((item, idx) => (
            <li key={`${item.kind}-${idx}`} className="flex items-start gap-2 text-sm">
              <ChevronRight className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-foreground">{item.label}: </span>
                <span className="text-muted-foreground">{item.value}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(data.user_controls.edit_memory_url)}
            className="h-8 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-1.5" />
            {t('screens.memory.editWhatIRemember')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(data.user_controls.pause_proactivity_url)}
            className="h-8 text-xs"
          >
            <Pause className="w-3 h-3 mr-1.5" />
            {t('screens.memory.pauseProactivity')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
