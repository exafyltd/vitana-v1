/**
 * VTID-05530 — small controls shared by the calendar and reminders forms: a selectable chip and a
 * stepper (previous / value / next) for a day or a time of day. The web's date and time pickers
 * (`datetime-local`, the popover calendar, the 15-minute select) become steppers here: every value
 * stays a plain `Date`, set in 15-minute and one-day steps, and every label is formatted by the
 * locale-format twin. Chevrons are text glyphs that swap in RTL; no physical left/right.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import { addDays } from './time';

export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={testID}
      style={[styles.chip, { borderColor: colors.border, backgroundColor: selected ? colors.primary : colors.card }]}
    >
      <Text size="sm" weight="600" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Arrow({ dir, label, onPress, testID }: { dir: 'prev' | 'next'; label: string; onPress: () => void; testID: string }): ReactElement {
  const { colors, direction } = useUITheme();
  const rtl = direction === 'rtl';
  const glyph = (dir === 'prev') !== rtl ? '‹' : '›';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} hitSlop={6} style={[styles.arrow, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text weight="700" style={{ color: colors.foreground }}>
        {glyph}
      </Text>
    </Pressable>
  );
}

/** previous · value · next */
export function Stepper({
  label,
  value,
  onPrev,
  onNext,
  testID,
}: {
  label?: string;
  value: string;
  onPrev: () => void;
  onNext: () => void;
  testID: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.stepper}>
      {label ? (
        <Text variant="caption" muted>
          {label}
        </Text>
      ) : null}
      <View style={styles.stepperRow}>
        <Arrow dir="prev" label={t('vcal.prev')} onPress={onPrev} testID={`${testID}-prev`} />
        <Text weight="600" style={[styles.stepperValue, { color: colors.foreground }]} testID={`${testID}-value`}>
          {value}
        </Text>
        <Arrow dir="next" label={t('vcal.next')} onPress={onNext} testID={`${testID}-next`} />
      </View>
    </View>
  );
}

export const TIME_STEP_MIN = 15;

/** A moment as a day stepper and a time stepper (15-minute steps). `testID-day-*` and `testID-time-*`. */
export function DateTimeField({ label, value, onChange, testID }: { label?: string; value: Date; onChange: (next: Date) => void; testID: string }): ReactElement {
  const fmt = useFormat();
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="caption" muted>
          {label}
        </Text>
      ) : null}
      <Stepper
        value={fmt.fmtDate(value, { weekday: 'short', day: 'numeric', month: 'short' })}
        onPrev={() => onChange(addDays(value, -1))}
        onNext={() => onChange(addDays(value, 1))}
        testID={`${testID}-day`}
      />
      <Stepper
        value={fmt.hhmm(value)}
        onPrev={() => onChange(new Date(value.getTime() - TIME_STEP_MIN * 60_000))}
        onNext={() => onChange(new Date(value.getTime() + TIME_STEP_MIN * 60_000))}
        testID={`${testID}-time`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  arrow: { borderWidth: 1, borderRadius: 999, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepper: { gap: 4 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperValue: { flex: 1, textAlign: 'center' },
  field: { gap: 8 },
});
