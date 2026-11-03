/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the building blocks
 * the mobile-web patient pages repeat (`src/pages/patient/*`): the page body
 * `p-6 space-y-6` with the `text-3xl font-bold` title and muted subtitle, the
 * spotlight `Panel` (= shadcn `Card`, kit `Card`), the stat panel
 * (`PanelHeader flex-row justify-between pb-2` + `text-2xl font-bold` value),
 * the dot timeline row (`w-2 h-2 rounded-full` + title + caption), the
 * label/badge row (`flex justify-between`) and the row skeletons
 * (`SpotlightLoading rows` on a phone: `VCardSkeleton size="row"`).
 * Visual values from the kit theme (tokens); logical start/end only.
 * React 19 `ReactElement`.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Text, type BadgeVariant } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';

export function PatientPage({ testID, title, subtitle, action, children }: { testID: string; title: string; subtitle: string; action?: ReactNode; children: ReactNode }): ReactElement {
  return (
    <ScrollView testID={testID} contentContainerStyle={styles.page}>
      <View style={action ? styles.headerWithAction : undefined}>
        <View style={[styles.header, action ? styles.shrink : undefined]}>
          <Text size="2xl" weight="700" accessibilityRole="header">
            {title}
          </Text>
          <Text muted>{subtitle}</Text>
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}

export function Panel({ title, description, children, testID }: { title: ReactNode; description?: string; children: ReactNode; testID?: string }): ReactElement {
  return (
    <Card testID={testID}>
      <CardHeader>
        {typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title}
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent style={styles.panelContent}>{children}</CardContent>
    </Card>
  );
}

/** A dashboard KPI panel: small title with an icon at the end, a big value and a muted caption. */
export function StatPanel({ title, icon, value, caption, testID }: { title: string; icon: ReactNode; value: string; caption: string; testID?: string }): ReactElement {
  return (
    <Card testID={testID}>
      <CardHeader style={styles.statHeader}>
        <CardTitle size="sm" weight="500" style={styles.shrink}>
          {title}
        </CardTitle>
        {icon}
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

export function TimelineRow({ dot, title, caption }: { dot: string; title: string; caption: string }): ReactElement {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.flex}>
        <Text size="sm" weight="500">
          {title}
        </Text>
        <Text size="xs" muted>
          {caption}
        </Text>
      </View>
    </View>
  );
}

export function MetricRow({ label, value, variant = 'outline' }: { label: string; value: string; variant?: BadgeVariant }): ReactElement {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.shrink}>{label}</Text>
      <Badge variant={variant}>{value}</Badge>
    </View>
  );
}

/** `SpotlightLoading` on a phone: `rows` × row skeleton, busy, with the hidden "loading" label. */
export function RowsSkeleton({ rows, testID }: { rows: number; testID?: string }): ReactElement {
  const { t } = useI18n();
  return (
    <View testID={testID} accessible accessibilityLabel={t('loading.default')} accessibilityState={{ busy: true }} style={styles.rows}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} style={styles.rowSkeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 24 },
  header: { gap: 8 },
  headerWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
  panelContent: { gap: 12 },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rows: { gap: 8 },
  rowSkeleton: { height: 64, borderRadius: 16 },
});
