/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the text helpers the web
 * memory and timeline screens share, MIRRORED natively (plan decision 2): the
 * web `src/components/timeline/timeline-meta.tsx` (signed, momentTitle,
 * momentFacts, tierLabel, CATEGORY_LINK), `src/components/memory/learning/routine-text.ts`
 * (routineSentence), `pillarLabel` (`src/hooks/useVitanaIndex.ts`) and the
 * `fmtNumber` / `fmtDate` / `fmtTime` / `formatDistanceToNow` locale helpers
 * (`src/lib/locale-format.ts`). They pull web-only deps (lucide-react, the
 * web i18n singleton, date-fns locales), so they are re-written here over
 * the native `t()` and Hermes `Intl`. Every word comes from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';
import type { PillarKey, TimelineMoment } from './data/timeline';
import type { Routine } from './data/learning';

const BUCKETS = new Set(['morning', 'midday', 'afternoon', 'evening', 'night']);
const INSIGHT_KINDS = new Set(['weakest_pillar_streak', 'pillar_slipping', 'pillar_rising']);

export function isPillar(v: unknown): v is PillarKey {
  return v === 'nutrition' || v === 'hydration' || v === 'exercise' || v === 'sleep' || v === 'mental';
}

/** Where "Open" goes for a moment (by category). `/memory/diary` is `/daily-diary` on phones (web App.tsx:720-727). */
export const CATEGORY_LINK: Partial<Record<string, string>> = {
  index: '/health/vitana-index',
  nutrition: '/health/vitana-index',
  hydration: '/health/vitana-index',
  exercise: '/health/vitana-index',
  sleep: '/health/vitana-index',
  mental: '/health/vitana-index',
  cross_pillar: '/health/vitana-index',
  diary: '/daily-diary',
  vitana: '/memory',
};

export type MemoryText = ReturnType<typeof buildText>;

function buildText(t: (key: string, params?: Params) => string, language: string) {
  const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(language, opts).format(n);
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);
  const pillarLabel = (p: PillarKey) => t(`vitanaIndex.${p}`);
  const lookup = (key: string) => {
    const s = t(key);
    return s && s !== key ? s : null;
  };

  /** "+6" / "−3", isolated so the sign stays in front in right-to-left text. */
  const signed = (n: number) => {
    const s = fmtNumber(Math.abs(n));
    const v = n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
    return `\u2066${v}\u2069`;
  };

  const tierLabel = (tier: string) => lookup(`vitanaIndex.tiers.${tier.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`) ?? tier;

  const momentTitle = (item: Pick<TimelineMoment, 'topic' | 'category'>) => lookup(`timeline.topic.${item.topic}`) ?? t(`timeline.category.${item.category}`);

  const momentFacts = (item: Pick<TimelineMoment, 'summary'>): string[] => {
    const p = item.summary?.params ?? {};
    const out: string[] = [];
    if (typeof p.amount_ml === 'number') out.push(t('timeline.unit.ml', { n: fmtNumber(p.amount_ml) }));
    if (typeof p.hours === 'number') out.push(t('timeline.unit.hours', { n: fmtNumber(p.hours, { maximumFractionDigits: 1 }) }));
    if (typeof p.minutes === 'number') out.push(t('timeline.unit.minutes', { n: fmtNumber(p.minutes) }));
    if (typeof p.streak_days === 'number') out.push(t('timeline.unit.days', { n: fmtNumber(p.streak_days) }));
    if (typeof p.score_total === 'number') out.push(t('timeline.unit.score', { n: fmtNumber(p.score_total) }));
    if (typeof p.insight_kind === 'string' && INSIGHT_KINDS.has(p.insight_kind) && isPillar(p.pillar)) {
      out.push(t(`timeline.insight.${p.insight_kind}`, { pillar: pillarLabel(p.pillar) }));
    } else if (isPillar(p.pillar)) out.push(pillarLabel(p.pillar));
    if (p.via === 'voice' || p.via === 'manual' || p.via === 'diary') out.push(t(`timeline.via.${p.via}`));
    return out;
  };

  const bucket = (v: unknown) => (typeof v === 'string' && BUCKETS.has(v) ? t(`memoryLearning.bucket.${v}`) : null);
  /** Weekday name for 0 = Sunday … 6 = Saturday (4 Jan 2026 was a Sunday). */
  const weekday = (i: number) => fmtDate(new Date(2026, 0, 4 + i, 12), { weekday: 'long' });

  const routineSentence = (r: Routine): string => {
    const m = r.metadata ?? {};
    switch (r.routine_kind) {
      case 'screen_habit':
        if (typeof m.path === 'string' && typeof m.days === 'number') return t('memoryLearning.routine.screen_habit', { screen: m.path, days: fmtNumber(m.days) });
        break;
      case 'active_hours': {
        const b = bucket(m.bucket);
        if (b) return t('memoryLearning.routine.active_hours', { bucket: b });
        break;
      }
      case 'feature_affinity':
        if (typeof m.category === 'string') return t('memoryLearning.routine.feature_affinity', { area: t(`timeline.category.${m.category}`) });
        break;
      case 'pillar_rhythm': {
        const b = bucket(m.bucket);
        if (isPillar(m.pillar) && b && typeof m.days_per_week === 'number') {
          return t('memoryLearning.routine.pillar_rhythm', { pillar: pillarLabel(m.pillar), bucket: b, n: fmtNumber(Math.max(1, Math.round(m.days_per_week))) });
        }
        break;
      }
      case 'time_of_day_preference': {
        const b = bucket(m.time_of_day);
        if (b) return t('memoryLearning.routine.time_of_day_preference', { bucket: b });
        break;
      }
      case 'day_of_week_rhythm':
        if (typeof m.dow_index === 'number' && m.dow_index >= 0 && m.dow_index <= 6) return t('memoryLearning.routine.day_of_week_rhythm', { day: weekday(m.dow_index) });
        break;
      case 'category_affinity':
        if (typeof m.tag === 'string' && m.tag.trim()) return t('memoryLearning.routine.category_affinity', { tag: m.tag.trim().slice(0, 40) });
        break;
    }
    return t('memoryLearning.routine.generic');
  };

  /** "3 hours ago" in the member's language (web formatDistanceToNow(…, { addSuffix: true })). */
  const timeAgo = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const diff = then - Date.now();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    const min = 60_000;
    const hour = 60 * min;
    const day = 24 * hour;
    if (abs < hour) return rtf.format(Math.round(diff / min), 'minute');
    if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
    if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
    if (abs < 365 * day) return rtf.format(Math.round(diff / (30 * day)), 'month');
    return rtf.format(Math.round(diff / (365 * day)), 'year');
  };

  return { t, fmtNumber, fmtDate, pillarLabel, signed, tierLabel, momentTitle, momentFacts, routineSentence, timeAgo };
}

/** The memory text helpers bound to the member's language. */
export function useMemoryText(): MemoryText {
  const { t, language } = useI18n();
  return useMemo(() => buildText(t, language), [t, language]);
}
