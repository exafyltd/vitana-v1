/**
 * VTID-05530 — "this overlaps with …" under the time pickers: native twin of the web's
 * `vcal/OverlapWarning.tsx` and `vcal/useOverlap.ts`. A warning, never a block: the member decides.
 * Other calendars and other roles show as busy time (no title, by design). A failed check shows
 * nothing.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import { fetchCalendarConflicts, type CalendarConflict } from './data/api';

const SETTLE_MS = 400;

/** Asks the gateway what a chosen time collides with, once the member stops fiddling with the pickers. */
export function useOverlap(start: Date | null, end: Date | null, role: string | null, excludeEventId?: string): CalendarConflict[] {
  const startMs = start && !Number.isNaN(start.getTime()) ? start.getTime() : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
  const [found, setFound] = useState<CalendarConflict[]>([]);

  useEffect(() => {
    if (startMs === null || (endMs !== null && endMs <= startMs)) {
      setFound([]);
      return undefined;
    }
    let live = true;
    const id = setTimeout(() => {
      Promise.resolve()
        .then(() => fetchCalendarConflicts(new Date(startMs), endMs === null ? null : new Date(endMs), role, excludeEventId))
        .then((c) => live && setFound(c))
        .catch(() => live && setFound([]));
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [startMs, endMs, role, excludeEventId]);

  return found;
}

/** The catalog writes these placeholders as `{{name}}`; fill them (and the single-brace form) by hand. */
export function fillTemplate(template: string, params: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(params)) out = out.split(`{{${k}}}`).join(v).split(`{${k}}`).join(v);
  return out;
}

export function OverlapWarning({ conflicts }: { conflicts: CalendarConflict[] }): ReactElement | null {
  const { t } = useI18n();
  const fmt = useFormat();
  if (!conflicts.length) return null;
  const line = (c: CalendarConflict): string => {
    const range = `${fmt.hhmm(c.start_time)}–${fmt.hhmm(c.end_time ?? c.start_time)}`;
    if (c.kind === 'own' && c.title) return fillTemplate(t('vcal.overlap.own'), { title: c.title, time: range });
    if (c.kind === 'external') return fillTemplate(t('vcal.overlap.external'), { time: range });
    return fillTemplate(t('vcal.overlap.busy'), { time: range });
  };
  return (
    <View accessibilityRole="alert" style={styles.box} testID="vcal-overlap">
      <Text weight="700" style={styles.ink}>
        {t('vcal.overlap.title')}
      </Text>
      {conflicts.slice(0, 3).map((c, i) => (
        <Text key={`${c.start_time}-${i}`} size="sm" style={styles.ink}>
          {line(c)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, padding: 12, gap: 2, backgroundColor: '#FFF4D6' },
  ink: { color: '#6B4300' },
});
