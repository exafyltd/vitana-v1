/**
 * VTID-03107 · Find-a-Match soft-counter inline component.
 *
 * Shows the user their current match_posts quota usage. Designed to render
 * above the IntentComposer submit button. v1 is SOFT-counter only — backend
 * returns 200 for post creation; this UI shows progress + upgrade nudge when
 * the user approaches/hits their limit, but does not block submission.
 *
 * Pulls usage from /billing/me via useBilling(). Hides entirely when:
 *   - Loading
 *   - usage[match_posts] is missing (unknown plan)
 *   - User has plenty of quota remaining (used < 80% of quota)
 */

import { useNavigate } from 'react-router-dom';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { t } from '@/lib/i18n-toast';
import { useBilling } from '@/hooks/useBilling';

interface IntentLimitInlineProps {
  /** Override the feature key — default 'match_posts'. Pass 'match_reveals' for reveal screens. */
  featureKey?: string;
  /** Display only when used >= warningThreshold * quota. Default 0.8 (80%) */
  warningThreshold?: number;
}

export function IntentLimitInline({
  featureKey = 'match_posts',
  warningThreshold = 0.8,
}: IntentLimitInlineProps) {
  const navigate = useNavigate();
  const { data } = useBilling();
  if (!data) return null;

  const usage = data.usage[featureKey];
  if (!usage || usage.quota <= 0) return null;

  const pct = usage.used / usage.quota;
  if (pct < warningThreshold) return null;

  const isAtLimit = usage.used >= usage.quota;
  const remaining = Math.max(0, usage.quota - usage.used);

  return (
    <div
      role={isAtLimit ? 'alert' : 'status'}
      className={`rounded-md border p-3 text-sm space-y-2 ${
        isAtLimit
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-amber-400/40 bg-amber-50 dark:bg-amber-900/10'
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className={`h-4 w-4 mt-0.5 ${isAtLimit ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium">
            {isAtLimit
              ? t(`paywall.${featureKey}.title`)
              : t('billing.features.used', { used: usage.used, limit: usage.quota, unit: '' })}
          </p>
          <Progress value={Math.min(100, pct * 100)} className="h-1.5" aria-label={`${usage.used} / ${usage.quota}`} />
          <p className="text-xs text-muted-foreground">
            {isAtLimit
              ? t(`paywall.${featureKey}.body`)
              : `${remaining} ${t('billing.features.used', { used: '', limit: '', unit: '' }).trim() || ''}`}
          </p>
        </div>
      </div>
      <Button onClick={() => navigate('/wallet/subscriptions')} size="sm" variant="outline" className="w-full">
        <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
        {t('billing.state.upgrade')}
      </Button>
    </div>
  );
}
