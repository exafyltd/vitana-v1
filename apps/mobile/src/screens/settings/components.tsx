/**
 * VTID-05431 (Native Wave 2, settings lane) — the building blocks every
 * settings section repeats on the web: the rounded `Panel` card with an icon
 * + title header (`Card className="rounded-2xl …"` / `CardContent p-5`), the
 * title / description / `Switch` row (`flex items-center justify-between
 * py-2.5`) and the uppercase group caption. Visual values from the kit theme
 * (tokens); logical start/end only. React 19 `ReactElement`.
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { SettingsIcon, Switch, type SettingsGlyph } from '../../ports/settings-ui';

export function SectionCard({
  icon,
  title,
  children,
  testID,
  style,
}: {
  icon?: SettingsGlyph;
  title?: string;
  children: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {title ? (
        <View style={styles.cardHeader}>
          {icon ? <SettingsIcon name={icon} size={18} color={colors.primary} /> : null}
          <Text weight="600" size="sm" accessibilityRole="header">
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SettingRow({
  title,
  description,
  hint,
  icon,
  right,
  titleWeight = '500',
  truncate,
  testID,
}: {
  title: string;
  truncate?: boolean;
  description?: string | null;
  hint?: string | null;
  icon?: ReactNode;
  right?: ReactNode;
  titleWeight?: '400' | '500' | '600';
  testID?: string;
}): ReactElement {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          {icon}
          <Text size="sm" weight={titleWeight} style={styles.shrink}>
            {title}
          </Text>
        </View>
        {description ? (
          <Text size="xs" muted numberOfLines={truncate ? 1 : undefined}>
            {description}
          </Text>
        ) : null}
        {hint ? (
          <Text size="xs" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** A row with a kit `Switch`; controlled when `checked` is given, else uncontrolled from `defaultChecked` (the web's local switches). */
export function ToggleRow({
  title,
  description,
  hint,
  icon,
  checked,
  defaultChecked,
  onChange,
  disabled,
  testID,
  titleWeight,
  truncate,
}: {
  title: string;
  truncate?: boolean;
  description?: string | null;
  hint?: string | null;
  icon?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
  titleWeight?: '400' | '500' | '600';
}): ReactElement {
  return (
    <SettingRow
      title={title}
      description={description}
      hint={hint}
      icon={icon}
      titleWeight={titleWeight}
      truncate={truncate}
      right={<Switch testID={testID} checked={checked} defaultChecked={defaultChecked} onCheckedChange={onChange} disabled={disabled} accessibilityLabel={title} />}
    />
  );
}

export function GroupCaption({ children }: { children: string }): ReactElement {
  return (
    <Text size="xs" weight="600" muted style={styles.caption}>
      {children}
    </Text>
  );
}

export function Divider(): ReactElement {
  const { colors } = useUITheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shrink: { flexShrink: 1 },
  caption: { paddingTop: 12, paddingBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  divider: { height: StyleSheet.hairlineWidth, opacity: 0.3 },
});
