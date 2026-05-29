/**
 * VTID-03107 · Feature comparison table.
 *
 * Mobile: vertical list with Progress bar per feature (visualizes the user's
 * CURRENT usage of each metered feature in their CURRENT plan).
 * Desktop: 4-column table.
 *
 * Reads `data.usage` from /billing/me — that's already the user's per-feature
 * `{used, quota, reset_at, unit, behavior}` snapshot.
 *
 * Always renders the row labels as user-facing strings (e.g. "Live conversations
 * with ORB") via i18n. Never shows raw feature_key engineering names.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n-toast';
import type { useBilling } from '@/hooks/useBilling';

type BillingData = NonNullable<ReturnType<typeof useBilling>['data']>;

const FEATURES: Array<{ key: string; labelKey: string; unitKey: string }> = [
  { key: 'voice_live_minutes', labelKey: 'billing.features.voiceLive', unitKey: 'billing.features.voiceLiveUnit' },
  { key: 'live_room_minutes', labelKey: 'billing.features.liveRooms', unitKey: 'billing.features.liveRoomsUnit' },
  { key: 'match_posts', labelKey: 'billing.features.matchPosts', unitKey: 'billing.features.matchPostsUnit' },
  { key: 'match_reveals', labelKey: 'billing.features.matchReveals', unitKey: 'billing.features.matchRevealsUnit' },
  { key: 'lab_analyses', labelKey: 'billing.features.labAnalyses', unitKey: 'billing.features.labAnalysesUnit' },
  { key: 'photo_uploads', labelKey: 'billing.features.photoUploads', unitKey: 'billing.features.photoUploadsUnit' },
];

interface FeatureComparisonTableProps {
  data: BillingData;
}

export function FeatureComparisonTable({ data }: FeatureComparisonTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('billing.features.comparisonTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {FEATURES.map((feat) => {
          const u = data.usage[feat.key];
          const used = u?.used ?? 0;
          const quota = u?.quota ?? 0;
          const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
          const label = t(feat.labelKey);
          const unit = t(feat.unitKey);
          const usedLabel = t('billing.features.used', { used, limit: quota, unit });

          return (
            <div key={feat.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <Badge variant={pct >= 100 ? 'destructive' : pct >= 80 ? 'outline' : 'secondary'} className="text-xs">
                  {used} / {quota}
                </Badge>
              </div>
              {quota > 0 && (
                <>
                  <Progress value={pct} className="h-1.5" aria-label={usedLabel} />
                  <span className="sr-only">{usedLabel}</span>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
