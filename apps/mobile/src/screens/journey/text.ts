/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the text helpers
 * the web journey components use, MIRRORED natively over the native `t()` and
 * Hermes `Intl` (they live in modules that import the web i18n runtime —
 * class-B — so they are re-implemented, not core-extracted):
 *  - `localizeGoal` (`src/lib/goalLabel.ts`): seeded English Life-Compass goals → catalog keys;
 *  - `localizeMatchReason` (`src/lib/matchReason.ts`): structured / legacy reasons → the active language;
 *  - `fmtDate` / `fmtTime` / `fmtNumber` / `formatDate(…, "EEE" | "d" | "MMM")` (`src/lib/locale-format.ts`).
 * Every word comes from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';
import type { MatchReason } from './data/supabase';

const GOAL_KEY: Record<string, string> = {
  'Improve quality of life and extend lifespan': 'improveQualityExtendLifespan',
  'Build Financial Freedom': 'buildFinancialFreedom',
  'Transform Health': 'transformHealth',
  'Find Life Partner': 'findLifePartner',
  'Advance Career': 'advanceCareer',
  'Master New Skills': 'masterNewSkills',
  'Spiritual Life': 'spiritualLife',
  'Earn from recommendations': 'earnFromRecommendations',
};

const PILLAR_KEY: Record<string, string> = {
  sleep: 'matchReasonPillarSleep',
  nutrition: 'matchReasonPillarNutrition',
  exercise: 'matchReasonPillarExercise',
  hydration: 'matchReasonPillarHydration',
  mental: 'matchReasonPillarMental',
};

const PILLAR_NAME_TO_KEY: Record<string, string> = {
  sleep: 'sleep',
  nutrition: 'nutrition',
  exercise: 'exercise',
  hydration: 'hydration',
  'mental wellbeing': 'mental',
  schlaf: 'sleep',
  ernährung: 'nutrition',
  bewegung: 'exercise',
  flüssigkeitshaushalt: 'hydration',
  'mentale gesundheit': 'mental',
};

const REASON_KEY: Record<string, string> = {
  'Shared wellness interests': 'matchReasonSharedInterests',
  'Similar daily routines': 'matchReasonDailyRoutines',
  'Compatible fitness goals': 'matchReasonFitnessGoals',
  'Matching activity times': 'matchReasonActivityTimes',
  'Nearby location': 'matchReasonNearby',
  'Similar wellness journey stage': 'matchReasonJourneyStage',
  'Morning routine & wellness goals align': 'matchReasonRoutine',
  'Similar activity patterns & interests': 'matchReasonActivity',
  'Shared fitness & mindfulness journey': 'matchReasonFitness',
  'Compatible lifestyle & schedule': 'matchReasonLifestyle',
  'Overlapping health goals': 'matchReasonGoals',
  'Mutual wellness interests': 'matchReasonInterests',
  'Suggested based on your profile': 'matchReasonGeneric',
  'Great wellness alignment!': 'matchReasonGreatAlignment',
  'Similar Vitana Index — comparable longevity stage': 'matchReasonSimilarIndex',
  'Ähnlicher Vitana-Index – ähnliche Longevity-Phase': 'matchReasonSimilarIndex',
  'Active member of the longevity community': 'matchReasonActiveMember',
  'Aktives Mitglied der Longevity-Community': 'matchReasonActiveMember',
};

type T = (key: string, params?: Params) => string;

function buildText(t: T, language: string) {
  const fmtNumber = (n: number) => new Intl.NumberFormat(language).format(n);
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);
  const fmtTime = (d: Date | string, opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) => fmtDate(d, opts);
  /** date-fns `EEE` / `d` / `MMM` (the EventsPreview date badge). */
  const formatDate = (d: Date | string, pattern: 'EEE' | 'd' | 'MMM') =>
    fmtDate(d, pattern === 'EEE' ? { weekday: 'short' } : pattern === 'd' ? { day: 'numeric' } : { month: 'short' });

  const localizeGoal = (goal: string | null | undefined): string => {
    if (!goal) return '';
    const key = GOAL_KEY[goal.trim()];
    return key ? t(`screens.autopilotdashboard.goalLabels.${key}`) : goal;
  };

  const localizePillar = (pillarKey: string) => {
    const sub = PILLAR_KEY[pillarKey];
    return sub ? t(`screens.crossover.${sub}`) : pillarKey;
  };

  const localizeCode = (code: string, params?: Record<string, string | number>): string => {
    switch (code) {
      case 'shared_pillar': {
        const pillarKey = String(params?.pillar ?? '');
        return t('screens.crossover.matchReasonSharedPillar', { pillar: localizePillar(pillarKey) || pillarKey });
      }
      case 'similar_index':
        return t('screens.crossover.matchReasonSimilarIndex');
      case 'mutual_connections': {
        const count = Number(params?.count ?? 0);
        return t(`screens.crossover.${count === 1 ? 'matchReasonMutualConnectionsOne' : 'matchReasonMutualConnectionsOther'}`, { count });
      }
      case 'same_location':
        return t('screens.crossover.matchReasonSameLocation', { location: String(params?.location ?? '') });
      case 'active_member':
        return t('screens.crossover.matchReasonActiveMember');
      default:
        return '';
    }
  };

  const localizeLegacyString = (reason: string): string | null => {
    const s = reason.trim();
    const exact = REASON_KEY[s];
    if (exact) return t(`screens.crossover.${exact}`);
    const pillarMatch = s.match(/^You're both strong in (.+)$/i) || s.match(/^Ihr seid beide stark im Bereich (.+)$/i);
    if (pillarMatch) {
      const name = pillarMatch[1].trim();
      const key = PILLAR_NAME_TO_KEY[name.toLowerCase()];
      return t('screens.crossover.matchReasonSharedPillar', { pillar: key ? localizePillar(key) : name });
    }
    const mutualMatch = s.match(/^(\d+)\s+mutual connections?$/i) || s.match(/^(\d+)\s+gemeinsame Kontakt(?:e|person)$/i);
    if (mutualMatch) return localizeCode('mutual_connections', { count: Number(mutualMatch[1]) });
    const locMatch = s.match(/^Also in (.+)$/i) || s.match(/^Auch in (.+)$/i);
    if (locMatch) return localizeCode('same_location', { location: locMatch[1].trim() });
    return null;
  };

  const localizeMatchReason = (reason: MatchReason | null | undefined): string => {
    if (!reason) return '';
    if (typeof reason === 'object') return reason.code ? localizeCode(reason.code, reason.params) : '';
    const s = reason.trim();
    if (!s) return '';
    return localizeLegacyString(s) ?? s;
  };

  return { t, language, fmtNumber, fmtDate, fmtTime, formatDate, localizeGoal, localizeMatchReason };
}

export type JourneyText = ReturnType<typeof buildText>;

export function useJourneyText(): JourneyText {
  const { t, language } = useI18n();
  return useMemo(() => buildText(t, language), [t, language]);
}
