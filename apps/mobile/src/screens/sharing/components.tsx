/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — presentational blocks shared by the
 * sharing screens and sheets: the page frame, panels, status badges, toggle chips, labelled fields,
 * and the loading / empty / error states. Built on the ports layer and the kit theme; spacing is
 * logical (start / end) and every string arrives already translated from the screen.
 */
import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { statusTone, type StatusTone } from './rules';

export function Page({ title, description, actions, children, testID }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} testID={testID} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text muted>{description}</Text> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {children}
    </ScrollView>
  );
}

export function Panel({ title, description, children, testID, tone }: { title?: string; description?: string; children: ReactNode; testID?: string; tone?: 'default' | 'muted' }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: tone === 'muted' ? colors.muted : colors.card }]} testID={testID}>
      {title ? (
        <Text weight="700" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text size="sm" muted>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const KNOWN_STATUSES = ['draft', 'active', 'paused', 'completed', 'scheduled', 'published'];

export function StatusBadge({ status, label, testID }: { status: string; label?: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const tone: StatusTone = statusTone(status);
  const palette: Record<StatusTone, { bg: string; fg: string }> = {
    success: { bg: colors.statusSuccessSubtle, fg: colors.statusSuccess },
    info: { bg: colors.statusInfoSubtle, fg: colors.statusInfo },
    warning: { bg: colors.statusWarningSubtle, fg: colors.statusWarning },
    pending: { bg: colors.statusWarningSubtle, fg: colors.statusWarning },
    muted: { bg: colors.muted, fg: colors.mutedForeground },
  };
  const p = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.fg }]} testID={testID}>
      <Text size="xs" weight="600" style={{ color: p.fg }}>
        {label ?? (KNOWN_STATUSES.includes(status) ? t(`sharingNative.status.${status}`) : status)}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  testID,
  disabled,
  role = 'button',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  role?: 'button' | 'tab' | 'checkbox' | 'radio';
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'tab' ? { selected, disabled } : { checked: selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={[styles.chip, { borderColor: colors.border, backgroundColor: selected ? colors.primary : colors.card, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text size="sm" weight="600" style={{ color: selected ? colors.primaryForeground : colors.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children, label }: { children: ReactNode; label?: string }): ReactElement {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chipRow}>
      {children}
    </View>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.field}>
      <Text size="sm" weight="600">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function SwitchRow({ title, description, control }: { title: string; description?: string; control: ReactNode }): ReactElement {
  return (
    <View style={styles.switchRow}>
      <View style={styles.fill}>
        <Text weight="600">{title}</Text>
        {description ? (
          <Text variant="caption" muted>
            {description}
          </Text>
        ) : null}
      </View>
      {control}
    </View>
  );
}

export function EmptyBlock({ title, body, action, testID }: { title: string; body?: string; action?: { label: string; onPress: () => void; testID: string }; testID: string }): ReactElement {
  return (
    <View style={styles.empty} testID={testID}>
      <Text weight="700">{title}</Text>
      {body ? <Text muted>{body}</Text> : null}
      {action ? (
        <Button size="sm" onPress={action.onPress} testID={action.testID} style={styles.emptyAction}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

export function ErrorBlock({ message, retryLabel, onRetry, testID, retryTestID }: { message: string; retryLabel: string; onRetry: () => void; testID: string; retryTestID: string }): ReactElement {
  return (
    <View style={styles.empty} testID={testID} accessibilityRole="alert">
      <Text>{message}</Text>
      <Button variant="outline" size="sm" onPress={onRetry} testID={retryTestID} style={styles.emptyAction}>
        {retryLabel}
      </Button>
    </View>
  );
}

export function CardSkeletons({ count, testID }: { count: number; testID: string }): ReactElement {
  return (
    <View style={styles.stack} testID={testID}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

export function SheetActions({ children }: { children: ReactNode }): ReactElement {
  return <View style={styles.sheetActions}>{children}</View>;
}

export function SheetScroll({ children }: { children: ReactNode }): ReactElement {
  return (
    <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stack: { gap: 12 },
  fill: { flex: 1 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 96, gap: 16 },
  header: { gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  empty: { alignItems: 'flex-start', gap: 8, paddingVertical: 24 },
  emptyAction: { marginTop: 8 },
  stack: { gap: 12 },
  skeleton: { height: 160, borderRadius: 16 },
  sheetActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' },
  sheetScroll: { maxHeight: 520 },
  sheetContent: { gap: 14, paddingBottom: 8 },
});
