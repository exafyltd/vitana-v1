/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — the pieces both staff
 * pages share: the page header (`space-y-2`: `text-3xl` title + muted
 * subtitle) and the stat card (`CardHeader flex-row justify-between pb-2`
 * with a `text-sm` title and a 16 px icon, then the `text-2xl` figure and the
 * `text-xs` muted caption) of src/pages/staff/Dashboard.tsx and Queue.tsx.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardContent, CardHeader, Text } from '../../ports/ui';
import { StaffIcon, type StaffGlyph } from '../../ports/staff-ui';

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }): ReactElement {
  return (
    <View style={styles.header}>
      <Text size="2xl" weight="700" accessibilityRole="header">
        {title}
      </Text>
      <Text muted>{subtitle}</Text>
    </View>
  );
}

export function StatCard({ testID, title, icon, iconColor, value, caption }: { testID: string; title: string; icon: StaffGlyph; iconColor: string; value: string; caption: string }): ReactElement {
  return (
    <Card testID={testID}>
      <CardHeader style={styles.statHeader}>
        <Text size="sm" weight="500" style={styles.flex}>
          {title}
        </Text>
        <StaffIcon name={icon} size={16} color={iconColor} />
      </CardHeader>
      <CardContent>
        <Text size="2xl" weight="700">
          {value}
        </Text>
        <Text size="xs" muted>
          {caption}
        </Text>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  flex: { flex: 1 },
});
