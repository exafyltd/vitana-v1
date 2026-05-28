/**
 * VTID-03107 · Founding Member campaign banner.
 *
 * Renders the launch-time scarcity banner with a real-time "X of N spots
 * remaining" counter. Pulls from the public `/api/v1/billing/founding-status`
 * endpoint (no auth). Hides itself when:
 *   - campaign is exhausted (max_uses reached)
 *   - campaign deactivated by ops (is_active=false)
 *   - user is already on Premium (no point showing it)
 *
 * Refreshes every 30s while visible so the counter feels live.
 *
 * Drop-in placement: Home screen and `/wallet/subscriptions` top.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useBilling } from '@/hooks/useBilling';

interface FoundingStatus {
  ok: boolean;
  active: boolean;
  uses_count?: number;
  max_uses?: number;
  remaining?: number;
  code?: string | null;
  campaign?: string;
}

const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || '';
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

async function fetchFoundingStatus(): Promise<FoundingStatus | null> {
  try {
    const res = await fetch(`${GATEWAY_BASE}/api/v1/billing/founding-status`);
    if (!res.ok) return null;
    return (await res.json()) as FoundingStatus;
  } catch {
    return null;
  }
}

export function FoundingBanner() {
  const billing = useBilling();
  const [status, setStatus] = useState<FoundingStatus | null>(null);

  // Suppress for users already on a paid plan
  const isPaidUser =
    !!billing.data &&
    billing.data.plan.plan_key !== 'free' &&
    billing.data.plan.status !== 'free';

  useEffect(() => {
    if (isPaidUser) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    fetchFoundingStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    const id = window.setInterval(() => {
      fetchFoundingStatus().then((s) => {
        if (!cancelled) setStatus(s);
      });
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isPaidUser]);

  if (isPaidUser) return null;
  if (!status || !status.active || !status.code || !status.max_uses) return null;

  const usesCount = status.uses_count ?? 0;
  const max = status.max_uses;
  const remaining = status.remaining ?? Math.max(0, max - usesCount);

  return (
    <Card className="border-amber-400/40 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-transparent dark:from-amber-950/30 dark:via-orange-950/20">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
          <Sparkles className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold leading-tight">
            {t('billing.founding.bannerTitle', { max })}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {t('billing.founding.bannerBody', { code: status.code })}
          </p>
        </div>
        <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
          {t('billing.founding.spotsRemaining', { remaining, max })}
        </Badge>
      </CardContent>
    </Card>
  );
}
