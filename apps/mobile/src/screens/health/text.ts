/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the text helpers
 * the health screens share: `t()`, the pillar labels (web `pillarLabel` =
 * `vitanaIndex.<key>`, `getPillarLabel` = `health.pillars.<key>`) and the
 * `formatDate` patterns the web health components use (`src/lib/locale-format.ts`:
 * 'MMM dd, yyyy' and 'PPP'), re-written over Hermes `Intl`. Every word comes
 * from the catalogs.
 */
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { PillarKey } from '../../ports/health';

export const PILLAR_KEYS: readonly PillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];

export function useHealthText() {
  const { t, language, rtl } = useI18n();
  return useMemo(() => {
    const dateFmt = (opts: Intl.DateTimeFormatOptions) => (d: Date | string) => {
      const date = typeof d === 'string' ? new Date(d) : d;
      return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(language, opts).format(date);
    };
    return {
      t,
      language,
      rtl,
      /** `vitanaIndex.<key>` (web `pillarLabel`, useVitanaIndex.ts:235-237). */
      pillarLabel: (p: PillarKey) => t(`vitanaIndex.${p}`),
      /** `health.pillars.<key>` (web `getPillarLabel`, Health.tsx:209). */
      healthPillarLabel: (p: string) => t(`health.pillars.${p}`),
      /** formatDate(d, 'MMM dd, yyyy') */
      shortDate: dateFmt({ month: 'short', day: '2-digit', year: 'numeric' }),
      /** formatDate(d, 'PPP') */
      longDate: dateFmt({ dateStyle: 'long' }),
    };
  }, [t, language, rtl]);
}

export type HealthText = ReturnType<typeof useHealthText>;
