/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the text helpers the web
 * diary components use, MIRRORED natively over the native `t()` and Hermes
 * `Intl` (plan decision 2: they live in class-B or web-only modules):
 * `formatIndexDelta` (`src/lib/diary-index-sync.ts`), `formatDuration`
 * (`src/utils/sttHelpers.ts`), the `DateGroupHeader` label, the
 * `PhotoEntryCard` tag labels, `formatDistanceToNow(…, { addSuffix: true })`
 * and `fmtDate` (`src/lib/locale-format.ts`). Every word comes from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { Params } from '../../i18n';
import type { PillarDelta } from './data/entries';

const PILLARS = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'] as const;
const SYSTEM_TAGS = new Set(['diary', 'photo', 'voice', 'text']);

/** "1:05" (web formatDuration). */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildText(t: (key: string, params?: Params) => string, language: string) {
  const fmtNumber = (n: number) => new Intl.NumberFormat(language).format(n);
  const fmtDate = (d: Date | string, opts?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, opts).format(typeof d === 'string' ? new Date(d) : d);

  /** "Nutrition +6 · Hydration +6 · Mental +5": at most three rising pillars, largest first. */
  const formatIndexDelta = (delta: PillarDelta | null | undefined): string => {
    if (!delta) return '';
    return PILLARS.map((p) => [p, delta[p]] as const)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([p, v]) => `${t(`vitanaIndex.${p}`)} +${fmtNumber(v)}`)
      .join(' · ');
  };

  /** web DateGroupHeader: Today / Yesterday / This week (weeks start on Sunday) / a long date. */
  const dateGroupLabel = (date: Date): string => {
    const today = startOfDay(new Date());
    const day = startOfDay(date);
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    if (diffDays === 0) return t('screens.diary.today');
    if (diffDays === 1) return t('screens.diary.yesterday');
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    if (day >= weekStart && day <= today) return t('screens.diary.thisWeek');
    return fmtDate(date, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  /** System tags are stored as English slugs; translate them at display time (web PhotoEntryCard). */
  const tagLabel = (tag: string): string => (SYSTEM_TAGS.has(tag) ? t(`screens.diary.tagLabel_${tag}`) : tag);

  /** "3 hours ago" in the member's language. */
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

  return { t, language, fmtNumber, fmtDate, formatIndexDelta, dateGroupLabel, tagLabel, timeAgo };
}

export type DiaryText = ReturnType<typeof buildText>;

/** The diary text helpers bound to the member's language. */
export function useDiaryText(): DiaryText {
  const { t, language } = useI18n();
  return useMemo(() => buildText(t, language), [t, language]);
}
