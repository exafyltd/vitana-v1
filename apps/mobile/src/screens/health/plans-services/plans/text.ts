/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the text
 * helpers of the Plans screen, mirrored natively over `t()` and Hermes `Intl`:
 * `fmtDate` (src/lib/locale-format.ts) and `calculatePlanSummary`
 * (src/lib/planSummaryCalculator.ts — it imports the web i18n singleton and
 * locale-format, so it is re-written here, not core-extracted). The relative
 * "last updated" words the web hard-codes in English ("Just now", "2h ago",
 * "3d ago", "Never") come from the `healthNative` catalog.
 */
import { useCallback } from 'react';
import { useI18n } from '../../../../i18n/I18nProvider';

export function useFmtDate() {
  const { language } = useI18n();
  return useCallback(
    (d: Date | string, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d),
    [language],
  );
}

export type PlanSummary = { metricsLine: string; insightLine1: string; footerLine: string; lastUpdated: string };

const SUMMARY_TYPES = new Set(['nutrition', 'exercise', 'hydration', 'sleep', 'mental', 'supplement']);

/** calculatePlanSummary (planSummaryCalculator.ts:12-93), the fields PersonalizedPlanCard renders. */
export function usePlanSummary() {
  const { t } = useI18n();
  const fmtDate = useFmtDate();
  return useCallback(
    (plan: { plan_type: string; last_updated?: string | null }, now: Date = new Date()): PlanSummary => {
      const type = plan.plan_type;
      const known = SUMMARY_TYPES.has(type);
      const relative = (date: Date) => {
        const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (hours < 1) return t('healthNative.plans.justNow');
        if (hours < 24) return t('healthNative.plans.hoursAgo', { hours });
        if (days < 7) return t('healthNative.plans.daysAgo', { days });
        return fmtDate(date);
      };
      return {
        metricsLine: known ? t(`screens.health.planSummary_${type}_metrics`) : t('screens.health.planSummary_default_metrics'),
        insightLine1: known ? t(`screens.health.planSummary_${type}_insight1`) : '',
        footerLine: known ? t(`screens.health.planSummary_${type}_footer`) : '',
        lastUpdated: plan.last_updated ? relative(new Date(plan.last_updated)) : t('healthNative.plans.never'),
      };
    },
    [t, fmtDate],
  );
}
