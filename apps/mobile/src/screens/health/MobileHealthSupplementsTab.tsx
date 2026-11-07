/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Supplements
 * mode of the mobile-web /health dashboard (`HEALTH.SUPPLEMENTS
 * /health?mode=supplements`), a twin of
 * `src/components/health/mobile/MobileHealthSupplementsTab.tsx` and
 * `src/components/supplements/SupplementCard.tsx`: the category filter pills
 * (matched against the stored English category, as on web), the empty state
 * and one card per supplement.
 *
 * READS ONLY. On web the empty-state "Add supplement" button has no handler
 * (MobileHealthSupplementsTab.tsx:58) and the card's edit button is a
 * TODO no-op (:69); both stay no-ops here. The card's delete button deletes a
 * `user_supplements` row (SupplementCard.tsx:72-75) — a health-data write, so
 * the native button is rendered disabled (plan "No health data is written").
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, Spinner, Text, useUITheme } from '../../ports/ui';
import { HealthButtonIcon, HealthIcon, useHealthPalette, withAlpha } from '../../ports/health';
import { useHealthText } from './text';
import { useUserSupplements, type UserSupplement } from './data/records';

/** Filter ids are the web's English category words (they are matched against the stored category). */
export const SUPPLEMENT_FILTERS: ReadonlyArray<{ id: string; key: string }> = [
  { id: 'All', key: 'all' },
  { id: 'Vitamins', key: 'vitamins' },
  { id: 'Minerals', key: 'minerals' },
  { id: 'Amino Acids', key: 'aminoAcids' },
  { id: 'Adaptogens', key: 'adaptogens' },
  { id: 'Probiotics', key: 'probiotics' },
  { id: 'Antioxidants', key: 'antioxidants' },
  { id: 'Other', key: 'other' },
];

export function filterSupplements(list: UserSupplement[], filter: string): UserSupplement[] {
  return filter === 'All' ? list : list.filter((s) => s.category.toLowerCase().includes(filter.toLowerCase()));
}

export function SupplementCard({ supplement }: { supplement: UserSupplement }): ReactElement {
  const { colors } = useUITheme();
  const { t, shortDate } = useHealthText();
  return (
    <Card testID={`supplement-${supplement.id}`}>
      <CardContent style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={styles.fill}>
            <View style={styles.nameRow}>
              <Text weight="600" numberOfLines={1} style={styles.shrink}>
                {supplement.name}
              </Text>
              {!supplement.is_active ? (
                <Badge variant="secondary">
                  <Text size="xs">{t('screens.supplements.inactive')}</Text>
                </Badge>
              ) : null}
            </View>
            <Text size="sm" muted>
              {supplement.category}
            </Text>
            <View style={styles.facts}>
              {supplement.dosage ? (
                <Text size="sm" style={styles.half}>
                  <Text size="sm" muted>{`${t('screens.supplements.dosage')} `}</Text>
                  <Text size="sm" weight="500">
                    {supplement.dosage}
                  </Text>
                </Text>
              ) : null}
              {supplement.frequency ? (
                <Text size="sm" style={styles.half}>
                  <Text size="sm" muted>{`${t('screens.supplements.frequency')} `}</Text>
                  <Text size="sm" weight="500">
                    {supplement.frequency}
                  </Text>
                </Text>
              ) : null}
              {supplement.start_date ? (
                <Text size="sm" style={styles.full}>
                  <Text size="sm" muted>{`${t('screens.supplements.started')} `}</Text>
                  <Text size="sm" weight="500">
                    {shortDate(supplement.start_date)}
                  </Text>
                </Text>
              ) : null}
            </View>
            {supplement.notes ? (
              <Text size="sm" muted style={styles.notes}>
                {supplement.notes}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Button testID={`supplement-edit-${supplement.id}`} variant="ghost" size="sm" accessibilityLabel={t('healthNative.supplements.edit')} onPress={() => undefined}>
              <HealthButtonIcon name="Pencil" />
            </Button>
            <Button testID={`supplement-delete-${supplement.id}`} variant="ghost" size="sm" disabled accessibilityLabel={t('healthNative.supplements.delete')}>
              <HealthIcon name="Trash2" size={16} color={colors.destructive} />
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

export function MobileHealthSupplementsTab(): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t } = useHealthText();
  const { supplements, isLoading } = useUserSupplements();
  const [activeFilter, setActiveFilter] = useState('All');
  const filtered = filterSupplements(supplements, activeFilter);

  if (isLoading) {
    return (
      <View style={styles.loading} testID="health-supplements-loading">
        <Spinner accessibilityLabel={t('healthNative.loading')} />
      </View>
    );
  }

  return (
    <View style={[styles.px, styles.gap]} testID="health-supplements-list">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {SUPPLEMENT_FILTERS.map((f) => {
          const on = activeFilter === f.id;
          return (
            <Pressable
              key={f.id}
              testID={`supplement-filter-${f.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setActiveFilter(f.id)}
              style={[styles.pill, { backgroundColor: on ? palette.pillar.nutrition.tint : colors.muted }]}
            >
              <Text size="sm" weight="500" color={on ? palette.pillar.nutrition.accent : colors.mutedForeground}>
                {t(`healthNative.supplements.filters.${f.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View testID="health-supplements-empty" style={[styles.state, { borderColor: colors.border, backgroundColor: withAlpha(colors.primary, 0.05) }]}>
          <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <HealthIcon name="Pill" size={32} color={colors.primary} />
          </View>
          <Text size="lg" weight="600" style={styles.center}>
            {t('health.noSupplements')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('health.noSupplementsDesc')}
          </Text>
          <Button testID="health-supplements-add" size="sm" onPress={() => undefined}>
            <HealthButtonIcon name="Plus" />
            {t('health.addSupplement')}
          </Button>
        </View>
      ) : (
        <View style={styles.gapSm}>
          {filtered.map((s) => (
            <SupplementCard key={s.id} supplement={s} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 16 },
  gap: { gap: 16 },
  gapSm: { gap: 12 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  pills: { gap: 8, paddingBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  state: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  cardBody: { padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  fill: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 8 },
  half: { width: '50%' },
  full: { width: '100%' },
  notes: { marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8 },
});
