/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the template cards the
 * `/ai` pages stack, twins of the web `variant` each page passes:
 *
 *  - `SmartSuggestions` — `src/components/health/SmartSuggestions.tsx` `card`
 *    (reward dot = suggestions × 2, Sparkles title, type icon + priority badge,
 *    the `action →` link, the "all caught up" empty state).
 *  - `StandardCard` — `src/components/templates/StandardCard.tsx` `default`.
 *  - `RecommendationCard` — `src/components/templates/RecommendationCard.tsx` `list`.
 *  - `OfferCard` — `src/components/templates/OfferCard.tsx` `grid`.
 *  - `LabTestCard` — `src/components/LabTestCard.tsx`.
 *
 * The web prints the priority value and the default SmartSuggestions title
 * in English on every locale; the native cards read them from the catalogs.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, useUITheme, type BadgeVariant } from '../../../ports/ui';
import { CoachIcon, useCoachPalette } from '../../../ports/ai-coach';
import { useCoachText, type Priority } from '../text';
import { RewardDot } from '../components';

const PRIORITY_BADGE: Record<Priority, BadgeVariant> = { high: 'destructive', medium: 'default', low: 'secondary' };

function useCardSurface() {
  const { colors } = useUITheme();
  const p = useCoachPalette();
  return { backgroundColor: colors.card, borderColor: p.alpha(p.calendarAccent, 0.2) };
}

// ── SmartSuggestions ────────────────────────────────────────────────────

export type Suggestion = {
  title: string;
  description: string;
  type: 'action' | 'insight' | 'recommendation' | 'alert';
  priority: Priority;
  action?: string;
  onAction?: () => void;
};

const TYPE_ICON: Record<Suggestion['type'], string> = { action: 'Target', insight: 'Lightbulb', recommendation: 'Sparkles', alert: 'ArrowRight' };

export function SmartSuggestions({ suggestions, title, maxItems = 3, testID = 'card-smart-suggestions' }: { suggestions: Suggestion[]; title?: string; maxItems?: number; testID?: string }) {
  const { t, priority } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const surface = useCardSurface();
  const shown = suggestions.slice(0, maxItems);
  const typeColor: Record<Suggestion['type'], string> = { action: p.calendarPrimary, insight: p.calendarAccent, recommendation: p.calendarSecondary, alert: colors.destructive };
  return (
    <View testID={testID} style={[styles.card, surface]}>
      <RewardDot points={shown.length * 2} description={t('aiCoachNative.reward.suggestions')} testID={`${testID}-reward`} />
      <View style={styles.header}>
        <View style={styles.row}>
          <CoachIcon name="Sparkles" size={20} color={p.calendarPrimary} />
          <Text size="lg" weight="600" accessibilityRole="header">
            {title ?? t('aiCoachNative.suggestions.title')}
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        {shown.map((s, i) => (
          <View key={`${s.title}-${i}`} style={[styles.item, { backgroundColor: p.alpha(colors.background, 0.5) }]} testID={`${testID}-item`}>
            <CoachIcon name={TYPE_ICON[s.type]} size={20} color={typeColor[s.type]} />
            <View style={styles.fill}>
              <View style={styles.titleRow}>
                <Text weight="500" style={styles.shrink}>
                  {s.title}
                </Text>
                <Badge variant={PRIORITY_BADGE[s.priority]}>{priority(s.priority)}</Badge>
              </View>
              <Text size="sm" muted>
                {s.description}
              </Text>
              {s.action ? (
                <Pressable accessibilityRole="button" onPress={s.onAction} style={styles.link} testID={`${testID}-action`}>
                  <Text size="sm" weight="500" color={p.calendarPrimary}>
                    {s.action}
                  </Text>
                  <CoachIcon name="ArrowRight" size={12} color={p.calendarPrimary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        {shown.length === 0 ? (
          <View style={styles.empty} testID={`${testID}-empty`}>
            <CoachIcon name="Lightbulb" size={32} color={p.alpha(colors.mutedForeground, 0.5)} />
            <Text size="sm" muted>
              {t('screens.health.allCaughtUpCheckBackLater')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── StandardCard ────────────────────────────────────────────────────────

export function StandardCard({ title, subtitle, content, onPress, testID }: { title: string; subtitle?: string; content?: string; onPress?: () => void; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text size="sm" weight="600" style={styles.wide} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text size="xs" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {content ? (
        <View style={styles.content}>
          <Text>{content}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── RecommendationCard (list) ───────────────────────────────────────────

export type RecommendationItem = { id: string; title: string; description?: string; priority?: Priority; etaMins?: number };

/** Web `formatTimeEstimate`: 45m / 1h / 1h 30m. */
function eta(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function RecommendationCard({ title, items, onItemClick, maxItems = 3, testID }: { title: string; items: RecommendationItem[]; onItemClick?: (item: RecommendationItem) => void; maxItems?: number; testID?: string }) {
  const { t, priority } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const surface = useCardSurface();
  const shown = items.slice(0, maxItems);
  return (
    <View testID={testID} style={[styles.card, surface]}>
      <View style={styles.header}>
        <Text size="sm" weight="600" style={styles.wide} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={styles.content}>
        {shown.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => onItemClick?.(item)}
            style={[styles.reco, { backgroundColor: p.alpha(colors.background, 0.5), borderColor: colors.border }]}
            testID={testID ? `${testID}-item` : undefined}
          >
            <View style={styles.titleRowBetween}>
              <Text size="sm" weight="500" style={styles.shrink}>
                {item.title}
              </Text>
              {item.priority ? <Badge variant={PRIORITY_BADGE[item.priority]}>{priority(item.priority)}</Badge> : null}
            </View>
            {/* The pages pass `description`; the web list renders `subtitle`, `etaMins`, `when`, `location`, `with` only. */}
            <View style={styles.titleRowBetween}>
              <View style={styles.row}>
                {item.etaMins ? (
                  <>
                    <CoachIcon name="Clock" size={12} color={colors.mutedForeground} />
                    <Text size="xs" muted>
                      {eta(item.etaMins)}
                    </Text>
                  </>
                ) : null}
              </View>
              <CoachIcon name="ArrowRight" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        ))}
        {shown.length === 0 ? (
          <View style={styles.empty} testID={testID ? `${testID}-empty` : undefined}>
            <Text size="sm" muted>
              {t('screens.templates.noRecommendationsAvailableRightNow')}
            </Text>
            <Text size="xs" muted>
              {t('screens.templates.checkBackLaterForPersonalizedSuggestions')}
            </Text>
          </View>
        ) : null}
        {items.length > maxItems ? (
          <Button variant="ghost" size="sm" onPress={() => undefined}>
            {t('screens.templates.viewAllLengthRecommendations', { length: items.length })}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

// ── OfferCard (grid) ────────────────────────────────────────────────────

export type OfferItem = { id: string; title: string; provider?: string; price?: number; description?: string; category?: string };

export function OfferCard({ title, offers, onOfferClick, maxItems = 6, testID }: { title: string; offers: OfferItem[]; onOfferClick?: (o: OfferItem) => void; maxItems?: number; testID?: string }) {
  const { t, fmtNumber } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const shown = offers.slice(0, maxItems);
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: p.alpha(p.calendarPrimary, 0.2) }]}>
      <View style={styles.header}>
        <Text size="sm" weight="600" style={styles.wide} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.grid}>
          {shown.map((o) => (
            <Pressable
              key={o.id}
              accessibilityRole="button"
              onPress={() => onOfferClick?.(o)}
              style={[styles.offer, { backgroundColor: p.alpha(colors.background, 0.8), borderColor: colors.border }]}
              testID={testID ? `${testID}-offer` : undefined}
            >
              <Text size="sm" weight="500" numberOfLines={2}>
                {o.title}
              </Text>
              {o.provider ? (
                <Text size="xs" muted>
                  {o.provider}
                </Text>
              ) : null}
              {o.description ? (
                <Text size="xs" muted numberOfLines={2}>
                  {o.description}
                </Text>
              ) : null}
              <View style={[styles.titleRowBetween, styles.offerFoot]}>
                {o.category ? <Badge variant="secondary">{o.category}</Badge> : <View />}
                {o.price ? (
                  <View style={styles.row}>
                    <CoachIcon name="DollarSign" size={12} color={p.calendarPrimary} />
                    <Text size="sm" weight="600" color={p.calendarPrimary}>
                      {fmtNumber(o.price)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Text size="sm" muted>
              {t('screens.templates.noOffersAvailableRightNow')}
            </Text>
            <Text size="xs" muted>
              {t('screens.templates.checkBackLaterForNewRecommendations')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── LabTestCard ─────────────────────────────────────────────────────────

export type LabTest = { id: string; name: string; description: string; categoryLabel: string; biomarkers: string[]; price: number; turnaround_days: number; sample_type: string; provider_name: string };

export function LabTestCard({ labTest, onOrder, testID = 'card-lab-test' }: { labTest: LabTest; onOrder: (l: LabTest) => void; testID?: string }) {
  const { t, fmtUsd, fmtNumber } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRowBetween}>
          {/* web `blood_markers`: bg-red-100 text-red-800 → the status-error tokens */}
          <View style={[styles.pill, { backgroundColor: p.alpha(colors.destructive, 0.15) }]}>
            <Text size="xs" weight="600" color={colors.destructive}>
              {labTest.categoryLabel}
            </Text>
          </View>
          <View style={styles.endAligned}>
            <Text size="2xl" weight="700" color={colors.primary} testID={`${testID}-price`}>
              {fmtUsd(labTest.price)}
            </Text>
            <Text size="sm" muted>
              {t('screens.common.value0marker', { value0: (labTest.price / labTest.biomarkers.length).toFixed(0) })}
            </Text>
          </View>
        </View>
        <Text size="xl" weight="600" accessibilityRole="header">
          {labTest.name}
        </Text>
        <Text size="sm" muted numberOfLines={2}>
          {labTest.description}
        </Text>
      </View>
      <View style={[styles.content, styles.labBody]}>
        <View style={styles.rowWide}>
          <View style={styles.row}>
            <CoachIcon name="Clock" size={16} color={colors.mutedForeground} />
            <Text size="sm" muted>
              {t('screens.common.turnaround_daysDays', { turnaround_days: labTest.turnaround_days })}
            </Text>
          </View>
          <View style={styles.row}>
            <CoachIcon name="Droplets" size={16} color={colors.mutedForeground} />
            <Text size="sm" muted>
              {labTest.sample_type}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <CoachIcon name="Building2" size={16} color={colors.mutedForeground} />
          <Text size="sm" weight="500">
            {labTest.provider_name}
          </Text>
          <CoachIcon name="Star" size={12} color={p.statusWarning} fill={p.statusWarning} />
          <Text size="xs" muted>
            {fmtNumber(4.8)}
          </Text>
        </View>
        <View style={styles.biomarkers}>
          <Text size="sm" weight="500">
            {t('screens.common.biomarkersLength', { length: labTest.biomarkers.length })}
          </Text>
          <View style={styles.wrap}>
            {labTest.biomarkers.slice(0, 4).map((b) => (
              <Badge key={b} variant="outline">
                {b}
              </Badge>
            ))}
            {labTest.biomarkers.length > 4 ? <Badge variant="outline">{t('screens.common.value0More', { value0: labTest.biomarkers.length - 4 })}</Badge> : null}
          </View>
        </View>
        <Button size="sm" onPress={() => onOrder(labTest)} testID={`${testID}-order`}>
          {t('screens.common.orderNow')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 8 },
  header: { padding: 24, paddingBottom: 12, gap: 6 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowWide: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8 },
  fill: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  titleRowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  shrink: { flexShrink: 1 },
  wide: { letterSpacing: 0.4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  reco: { padding: 12, borderRadius: 8, borderWidth: 1, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  offer: { flexBasis: '47%', padding: 12, borderRadius: 8, borderWidth: 1, gap: 8 },
  offerFoot: { paddingTop: 8, alignItems: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
  endAligned: { alignItems: 'flex-end' },
  labBody: { gap: 16 },
  biomarkers: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
