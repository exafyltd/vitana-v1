/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — shared building blocks
 * for the support and connectors screens: the screen scaffold (web
 * `StandardHeader` + the scrollable column) and the rounded panel (web
 * `Panel` / `Card className="rounded-2xl …"`). Ports only; colours from the kit
 * theme; logical start/end only. Every string arrives translated.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';

export function ScreenScaffold({
  title,
  description,
  emoji,
  toolbar,
  children,
  testID,
}: {
  title: string;
  description?: string;
  emoji?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scaffold} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {emoji ? `${emoji} ${title}` : title}
        </Text>
        {description ? (
          <Text muted size="sm">
            {description}
          </Text>
        ) : null}
      </View>
      {toolbar ? <View style={styles.toolbar}>{toolbar}</View> : null}
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function PanelTitle({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }): ReactElement {
  return (
    <View style={styles.titleRow}>
      {icon}
      <View style={styles.fill}>
        <Text size="sm" weight="600" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text size="xs" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaffold: { padding: 16, paddingBottom: 120, gap: 12 },
  header: { gap: 4 },
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
});
