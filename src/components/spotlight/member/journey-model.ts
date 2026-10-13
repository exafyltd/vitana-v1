import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import type { MyJourneyGoal, MyJourneyJourney } from '@/hooks/useMyJourney';

/**
 * VTID-05117 — pure helpers for the My Journey Spotlight hero. Only fields the
 * gateway actually returned are used; nothing is estimated (SR-24).
 */

const MOTIVATION_KEYS = [
  'screens.autopilotdashboard.motivation0',
  'screens.autopilotdashboard.motivation1',
  'screens.autopilotdashboard.motivation2',
  'screens.autopilotdashboard.motivation3',
  'screens.autopilotdashboard.motivation4',
  'screens.autopilotdashboard.motivation5',
] as const;

/** The day-rotated motivational line (same rotation as the legacy screen). */
export function motivationKey(now = Date.now()): (typeof MOTIVATION_KEYS)[number] {
  return MOTIVATION_KEYS[Math.floor(now / (1000 * 60 * 60 * 24)) % MOTIVATION_KEYS.length];
}

/** The progress line under the goal title, or null when the gateway returned nothing to show. */
export function journeyProgressLabel(goal: MyJourneyGoal | null, journey: MyJourneyJourney | null): string | null {
  if (goal?.has_deadline && goal.days_to_deadline != null) {
    return t('screens.autopilotdashboard.daysLeftCount', { days: fmtNumber(goal.days_to_deadline) });
  }
  if (journey && journey.total_days > 0) {
    return t('screens.autopilotdashboard.planDayOfTotal', { day: fmtNumber(journey.day_in_journey), total: fmtNumber(journey.total_days) });
  }
  return null;
}
