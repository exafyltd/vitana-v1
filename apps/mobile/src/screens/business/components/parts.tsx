/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the small building blocks
 * the commerce screens share: the web's `rounded-2xl border bg-card p-4`
 * panel, labelled fields, the big tappable option rows of the setup sheets,
 * the busy / problem / error lines, the "show more" disclosure, and the
 * native twin of the web's plain `<select>` (the kit's `Select`, a bottom-sheet
 * list on the phone).
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableRow, Skeleton, Spinner, Text, useUITheme } from '../../../ports/ui';
import { BizIcon, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, withAlpha, type BizGlyph } from '../../../ports/business-ui';

export function Panel({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.card }, style]}>
      {children}
    </View>
  );
}

export function Field({ label, hint, hintTone, children, testID }: { label?: ReactNode; hint?: string | null; hintTone?: 'muted' | 'error'; children: ReactNode; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.field} testID={testID}>
      {label ? typeof label === 'string' ? <Label>{label}</Label> : label : null}
      {children}
      {hint ? (
        <Text size="xs" color={hintTone === 'error' ? colors.destructive : colors.mutedForeground}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** The web's `flex min-h-16 w-full items-center gap-3 rounded-2xl border p-4` option button. */
export function ChoiceRow({
  icon,
  title,
  hint,
  onPress,
  testID,
  selected,
  trailing,
  disabled,
}: {
  icon?: BizGlyph;
  title: string;
  hint?: string | null;
  onPress: () => void;
  testID?: string;
  selected?: boolean;
  trailing?: ReactNode;
  disabled?: boolean;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <PressableRow
      onPress={onPress}
      testID={testID}
      disabled={disabled}
      accessibilityLabel={hint ? `${title}, ${hint}` : title}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      style={[
        styles.choice,
        { borderColor: selected ? withAlpha(colors.primary, 0.5) : colors.border, backgroundColor: selected ? withAlpha(colors.primary, 0.1) : colors.card },
      ]}
    >
      {icon ? <BizIcon name={icon} size={24} color={colors.primary} /> : null}
      <View style={styles.fill}>
        <Text weight="600">{title}</Text>
        {hint ? (
          <Text size="sm" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      {trailing}
    </PressableRow>
  );
}

/** The web's `ArchetypeSkeleton archetype="collection"` (a few card-shaped placeholders). */
export function CollectionSkeleton({ testID, label }: { testID?: string; label?: string }): ReactElement {
  return (
    <View style={styles.skeletons} testID={testID}>
      <Skeleton accessibilityLabel={label} style={styles.skeletonCard} />
      <Skeleton style={styles.skeletonCard} />
      <Skeleton style={styles.skeletonCard} />
    </View>
  );
}

export function Busy({ text, testID }: { text: string; testID?: string }): ReactElement {
  return (
    <View style={styles.inline} accessibilityRole="progressbar" accessibilityLabel={text} testID={testID}>
      <Spinner />
      <Text size="sm" muted>
        {text}
      </Text>
    </View>
  );
}

export function CenterSpinner({ label, testID }: { label?: string; testID?: string }): ReactElement {
  return (
    <View style={styles.center} testID={testID}>
      <Spinner accessibilityLabel={label} />
    </View>
  );
}

/** The amber "problem" box (`border-status-warning/40 bg-status-warning-subtle`). */
export function Problem({ text, testID }: { text: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="alert" testID={testID} style={[styles.problem, { borderColor: withAlpha(colors.statusWarning, 0.4), backgroundColor: colors.statusWarningSubtle }]}>
      <BizIcon name="TriangleAlert" size={16} color={colors.statusWarning} />
      <Text size="sm" style={styles.fill}>
        {text}
      </Text>
    </View>
  );
}

/** shadcn `Alert variant="destructive"`. */
export function ErrorAlert({ text, testID }: { text: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="alert" testID={testID} style={[styles.alert, { borderColor: withAlpha(colors.destructive, 0.5) }]}>
      <Text size="sm" color={colors.destructive}>
        {text}
      </Text>
    </View>
  );
}

/** A text button with a chevron that turns when open (`aria-expanded`). */
export function Disclosure({ label, open, onToggle, testID, bordered }: { label: string; open: boolean; onToggle: () => void; testID?: string; bordered?: boolean }): ReactElement {
  const { colors } = useUITheme();
  return (
    <PressableRow
      onPress={onToggle}
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ expanded: open } as never}
      style={[styles.disclosure, bordered ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingTop: 12 } : null]}
    >
      <Text size="sm" weight="600" style={styles.fill}>
        {label}
      </Text>
      <View style={open ? styles.turned : null}>
        <BizIcon name="ChevronDown" size={16} />
      </View>
    </PressableRow>
  );
}

/** The web's plain `<select>`: options with a value and a label. */
export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  accessibilityLabel,
  testID,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
}): ReactElement {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger testID={testID} accessibilityLabel={accessibilityLabel} style={styles.select}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent testID={testID ? `${testID}-list` : undefined}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} testID={testID ? `${testID}-option-${o.value}` : undefined}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A pill toggle (`rounded-full border px-4`, `aria-pressed`). */
export function Chip({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <PressableRow
      onPress={onPress}
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={[styles.chip, { borderColor: on ? withAlpha(colors.primary, 0.5) : colors.border, backgroundColor: on ? withAlpha(colors.primary, 0.1) : 'transparent' }]}
    >
      <Text size="sm" weight="500">
        {label}
      </Text>
    </PressableRow>
  );
}

export const styles = StyleSheet.create({
  skeletons: { gap: 12 },
  skeletonCard: { height: 72, borderRadius: 16 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  field: { gap: 6 },
  choice: { minHeight: 64, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  problem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  alert: { borderWidth: 1, borderRadius: 8, padding: 12 },
  disclosure: { minHeight: 44, justifyContent: 'space-between' },
  turned: { transform: [{ rotate: '180deg' }] },
  select: { minHeight: 48 },
  chip: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16 },
});
