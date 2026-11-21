/**
 * VTID-05530 — "Find a time" in the add form: native twin of the web's `vcal/FindTime.tsx`. The
 * member asks; the gateway answers with up to three free slots for the length they set, over
 * everything the calendar shows and inside their waking hours. Picking one fills the date and
 * times; nothing is saved until they save.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import { fetchFreeSlots, type FreeSlot } from './data/api';

const sameLocalDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function FindTime({ durationMin, role, onPick }: { durationMin: number; role: string | null; onPick: (start: Date, end: Date) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const asked = useRef(0);

  // A different length is a different question: drop the old answer, and let any answer still on its way go unheard.
  useEffect(() => {
    asked.current += 1;
    setState('idle');
    setSlots([]);
  }, [durationMin, role]);

  const ask = () => {
    const mine = ++asked.current;
    setState('loading');
    fetchFreeSlots(durationMin, role)
      .then((r) => {
        if (mine !== asked.current) return;
        // The form holds one date; a slot that runs past midnight cannot be filled in.
        setSlots(r.filter((s) => sameLocalDay(new Date(s.start), new Date(s.end))));
        setState('done');
      })
      .catch(() => {
        if (mine === asked.current) setState('error');
      });
  };

  return (
    <View style={styles.box} testID="vcal-find-time">
      <Pressable
        onPress={ask}
        disabled={state === 'loading'}
        accessibilityRole="button"
        accessibilityState={{ disabled: state === 'loading' }}
        testID="vcal-find-time-ask"
        style={[styles.ask, { backgroundColor: colors.muted, opacity: state === 'loading' ? 0.6 : 1 }]}
      >
        <Text>✨</Text>
        <Text weight="600">{t('vcal.findTime.action')}</Text>
      </Pressable>
      {state === 'loading' ? <Text variant="caption" muted>{t('vcal.findTime.loading')}</Text> : null}
      {state === 'error' ? <Text variant="caption" muted>{t('vcal.findTime.error')}</Text> : null}
      {state === 'done' && slots.length === 0 ? <Text variant="caption" muted>{t('vcal.findTime.none')}</Text> : null}
      {state === 'done' && slots.length > 0 ? (
        <View style={styles.slots} accessibilityLabel={t('vcal.findTime.pick')}>
          {slots.map((s, i) => {
            const start = new Date(s.start);
            const end = new Date(s.end);
            return (
              <Pressable
                key={s.start}
                onPress={() => onPick(start, end)}
                accessibilityRole="button"
                testID={`vcal-find-time-slot-${i}`}
                style={[styles.slot, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text size="sm">{`${fmt.fmtDate(start, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmt.hhmm(start)}–${fmt.hhmm(end)}`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 16, minHeight: 44 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
});
