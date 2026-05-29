/**
 * VTID-02000: Reward badge — renders a "earn X points" pill on a product card.
 *
 * The marketplace ships this slot reserved; it renders null until the reward
 * system (parallel session) provides a reward_preview on the product row.
 */

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
export interface RewardPreview {
  points_estimate?: number;
  currency?: string;
}

export function RewardBadge({ reward_preview }: { reward_preview?: RewardPreview | null }) {
  if (!reward_preview?.points_estimate) return null;
  return (
    <Badge variant="outline" className="gap-1 text-xs bg-amber-50 border-amber-200 text-amber-900">
      <Sparkles className="w-3 h-3" />{t('screens.rewards.earnValue0Pts', { value0: fmtDateTime(reward_preview.points_estimate) })}
    </Badge>
  );
}
