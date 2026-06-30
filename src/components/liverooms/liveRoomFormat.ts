import { t } from '@/lib/i18n-toast';

/**
 * Human-friendly planned-length label for a Live Room session, e.g.
 * "45 Min", "1 Std", "1 Std 30 Min" (DE) / "45 min", "1 h", "1 h 30 min" (EN).
 * Returns null when the duration is unknown so callers can omit the chip.
 */
export function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('screens.liverooms.durationMin', { value0: m });
  if (m === 0) return t('screens.liverooms.durationHour', { value0: h });
  return t('screens.liverooms.durationHourMin', { value0: h, value1: m });
}
