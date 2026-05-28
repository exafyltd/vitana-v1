/**
 * VTID-03107 · Launch auto-grant welcome banner.
 *
 * Shown ONCE to every user who received the launch auto-grant of 12 months
 * of Vitana Premium. Backend tags these subscriptions with
 * `metadata.source = 'launch_auto_grant_2026'` (see migration
 * supabase/migrations/20260526110000_VTID_03107_launch_auto_grant.sql).
 *
 * Hides when:
 *   - user's plan was NOT auto-granted (different source, or no sub)
 *   - user has already dismissed it (localStorage key per user)
 *   - their grant has expired (current_period_end in the past)
 *
 * One-time UX: there is no push, no email — the user opens the app and sees
 * the banner once. After dismissal, the plan card subtitle still shows
 * "auto-granted at launch · ends YYYY-MM-DD" so the source is always
 * traceable.
 */

import { useEffect, useMemo, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import type { BillingMe } from '@/lib/billingApi';

const AUTO_GRANT_SOURCE = 'launch_auto_grant_2026';

interface Props {
  data: BillingMe;
}

function dismissKeyFor(periodEnd: string | null): string {
  // Key the dismissal by the granted period_end so if ops re-runs the migration
  // to extend grants, the banner reappears.
  return `vitana.launch_grant_banner.dismissed.${periodEnd ?? 'unknown'}`;
}

export function LaunchGrantBanner({ data }: Props) {
  const isAutoGrant = data.plan.source === AUTO_GRANT_SOURCE;
  const periodEnd = data.plan.current_period_end;
  const dismissKey = useMemo(() => dismissKeyFor(periodEnd), [periodEnd]);

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(window.localStorage.getItem(dismissKey) === '1');
    } catch {
      // ignore
    }
  }, [dismissKey]);

  // Suppress if not an auto-grant, or grant expired, or user dismissed
  if (!isAutoGrant) return null;
  if (!periodEnd) return null;
  if (new Date(periodEnd).getTime() < Date.now()) return null;
  if (dismissed) return null;

  const endsLabel = fmtDate(new Date(periodEnd), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const onDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey, '1');
    } catch {
      // ignore
    }
  };

  return (
    <Card className="border-emerald-400/40 bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-2">
          <Gift className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-tight">
            {t('billing.launchGrant.title')}
          </p>
          <p className="text-sm text-muted-foreground leading-snug">
            {t('billing.launchGrant.body', { endsAt: endsLabel })}
          </p>
          <p className="text-xs text-muted-foreground/80 leading-snug">
            {t('billing.launchGrant.noAction')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-7 px-2"
          onClick={onDismiss}
          aria-label={t('billing.launchGrant.dismissAria')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('billing.launchGrant.dismissAria')}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
