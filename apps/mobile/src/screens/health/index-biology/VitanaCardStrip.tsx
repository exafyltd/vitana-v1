/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * Unified Card System strip the Vitana Index page mounts
 * (`<EnrichmentCardStrip screen="vitana-index" />`, VitanaIndexDetail.tsx:707),
 * a twin of `src/components/vitana/EnrichmentCardStrip.tsx` with
 * `maxCards = 3`, stacked:
 *
 *  - server cards first: `GET /enrichment-cards?screen=vitana-index` through
 *    the home lane's native `useEnrichmentCards` (src/screens/home/data/enrichment.ts),
 *    kept when `isServerCardPlaced(CARD_SCREENS['vitana-index'])` (boost: G3
 *    only); then the screen's static feature cards F3 (Daily Diary), F4
 *    (Talk to Vitana), F6 (Autopilot) that this device has not hidden;
 *  - nothing while the server cards load, nothing when the list is empty
 *    (the web strip "never an empty box").
 *
 * Each card is the `VitanaActionCard` layout (VitanaActionCard.tsx +
 * VitanaRecommendationHeader.tsx): the "Vitana" identity row with the
 * feature badge, the eyebrow, title, subtext (G3: the streak metric line,
 * boost-metric.ts) and the action button; the action and a body tap open the
 * card's deep link (`CARD_DEEP_LINKS`). F4 asks the ORB first on web
 * (`activateOrb()`); the native app has no ORB activation entry yet, so it
 * takes the web fallback, `/comm/talk-to-vitana`.
 *
 * Dismiss: a feature card's X hides it on this device for 7 days
 * (`useCardDismiss.ts`, AsyncStorage). A server card's X is a
 * `POST /enrichment-cards/dismiss` on web — the Index page issues no non-GET
 * (plan.md test plan "no code path issues a non-GET"), so that X is shown
 * disabled. Types whose web card is a bespoke widget (F1, F2, F7, F8) are
 * not placed on this screen by CARD_SCREENS and are skipped if a server row
 * names one.
 */
import { useMemo, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { useHealthPalette, withAlpha } from '../../../ports/health';
import { BiologyIcon, CARD_DEEP_LINKS, CARD_SCREENS, isServerCardPlaced, type VitanaCardType } from '../../../ports/health-biology';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useEnrichmentCards } from '../../home/data/enrichment';
import { useHealthText } from '../text';
import { useFeatureCardDismissals } from './data';

type CardMeta = { eyebrowKey: string; feature: string; icon: string };

const eyebrow = (type: string) => `screens.vitanaCards.${type}.eyebrow`;

/** Copy + identity of every card this strip can draw (the web components' COPY / feature / icon props). */
export const CARD_META: Partial<Record<VitanaCardType, CardMeta>> = {
  E1: { eyebrowKey: 'screens.vitanaCards.eyebrowProfile', feature: 'profilePhoto', icon: 'Camera' },
  E2: { eyebrowKey: 'screens.vitanaCards.eyebrowProfile', feature: 'profileSetup', icon: 'PenLine' },
  E3: { eyebrowKey: 'screens.vitanaCards.eyebrowCommunity', feature: 'uploadMedia', icon: 'MessageSquarePlus' },
  E4: { eyebrowKey: 'screens.vitanaCards.eyebrowProfile', feature: 'profileSetup', icon: 'Target' },
  E5: { eyebrowKey: 'screens.vitanaCards.eyebrowProfile', feature: 'profileSetup', icon: 'MapPin' },
  E6: { eyebrowKey: 'screens.vitanaCards.eyebrowConnect', feature: 'socialConnect', icon: 'Camera' },
  E7: { eyebrowKey: 'screens.vitanaCards.eyebrowConnect', feature: 'socialConnect', icon: 'Link2' },
  E8: { eyebrowKey: 'screens.vitanaCards.eyebrowConnect', feature: 'calendar', icon: 'CalendarDays' },
  E9: { eyebrowKey: 'screens.vitanaCards.eyebrowConnect', feature: 'importContacts', icon: 'Users' },
  E10: { eyebrowKey: 'screens.vitanaCards.eyebrowNotifications', feature: 'profileSetup', icon: 'Bell' },
  E11: { eyebrowKey: 'screens.vitanaCards.eyebrowProfile', feature: 'profilePhoto', icon: 'ImagePlus' },
  F3: { eyebrowKey: eyebrow('F3'), feature: 'dailyDiary', icon: 'Mic' },
  F4: { eyebrowKey: eyebrow('F4'), feature: 'talkToVitana', icon: 'MessageCircle' },
  F5: { eyebrowKey: eyebrow('F5'), feature: 'findAMatch', icon: 'Users' },
  F6: { eyebrowKey: eyebrow('F6'), feature: 'autopilot', icon: 'Zap' },
  F9: { eyebrowKey: eyebrow('F9'), feature: 'calendar', icon: 'CalendarDays' },
  F10: { eyebrowKey: eyebrow('F10'), feature: 'uploadMedia', icon: 'Clapperboard' },
  F11: { eyebrowKey: eyebrow('F11'), feature: 'discover', icon: 'Compass' },
  G1: { eyebrowKey: eyebrow('G1'), feature: 'completeProfile', icon: 'Rocket' },
  G2: { eyebrowKey: eyebrow('G2'), feature: 'findAMatch', icon: 'MessageCircle' },
  G3: { eyebrowKey: eyebrow('G3'), feature: 'dailyDiary', icon: 'Mic' },
};

export const STRIP_SCREEN = 'vitana-index' as const;
export const STRIP_MAX_CARDS = 3;

interface StripEntry {
  cardType: VitanaCardType;
  title?: string;
  description?: string;
  params?: Record<string, number>;
  server: boolean;
}

/** readPositiveCount (boost-metric.ts:12-16). */
function positiveCount(params: Record<string, number> | undefined, key: string): number | null {
  const value = params?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  return Math.floor(value);
}

function StripCard({ entry, onDismiss }: { entry: StripEntry; onDismiss?: () => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t, language } = useHealthText();
  const meta = CARD_META[entry.cardType] as CardMeta;
  const brand = palette.category[2];
  const headline = entry.title?.trim() || t(`screens.vitanaCards.${entry.cardType}.title`);
  const message = entry.description?.trim() || t(`screens.vitanaCards.${entry.cardType}.description`);
  const streak = entry.cardType === 'G3' ? positiveCount(entry.params, 'streak') : null;
  const subtext = streak === null ? message : t('screens.vitanaCards.G3.metric', { count: new Intl.NumberFormat(language).format(streak), message });
  const deepLink = CARD_DEEP_LINKS[entry.cardType];
  const open = () => {
    if (deepLink) navigateToWebPath(deepLink);
  };
  return (
    <Pressable
      testID={`vitana-card-${entry.cardType}`}
      accessibilityRole="button"
      accessibilityLabel={headline}
      onPress={open}
      style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(brand, 0.35) }]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={[styles.orb, { backgroundColor: withAlpha(brand, 0.25), borderColor: brand }]} />
          <Text size="sm" weight="600" color={brand}>
            {t('screens.vitanaIdentity.vitana')}
          </Text>
        </View>
        <View style={styles.headerEnd}>
          <View style={[styles.featureBadge, { backgroundColor: withAlpha(brand, 0.15) }]}>
            <BiologyIcon name={meta.icon} size={12} color={brand} />
            <Text size="xs" weight="600" color={brand}>
              {t(`screens.vitanaIdentity.${meta.feature}`)}
            </Text>
          </View>
          {onDismiss || entry.server ? (
            <Button
              testID={`vitana-card-${entry.cardType}-dismiss`}
              variant="ghost"
              size="sm"
              disabled={!onDismiss}
              onPress={onDismiss}
              accessibilityLabel={t('screens.vitanaIdentity.dismissCard')}
              style={styles.dismiss}
            >
              <BiologyIcon name="X" size={14} color={colors.mutedForeground} />
            </Button>
          ) : null}
        </View>
      </View>
      <Text size="xs" weight="600" muted style={styles.eyebrow}>
        {t(meta.eyebrowKey)}
      </Text>
      <View style={styles.bodyRow}>
        <View style={styles.fill}>
          <Text size="sm" weight="700" numberOfLines={2}>
            {headline}
          </Text>
          <Text size="xs" muted numberOfLines={2} style={styles.subtext}>
            {subtext}
          </Text>
        </View>
        <Button testID={`vitana-card-action-${entry.cardType}`} size="sm" variant="secondary" onPress={open}>
          <BiologyIcon name={meta.icon} size={14} />
          {t(`screens.vitanaCards.${entry.cardType}.action`)}
        </Button>
      </View>
    </Pressable>
  );
}

export function VitanaCardStrip(): ReactElement | null {
  const { t } = useHealthText();
  const config = CARD_SCREENS[STRIP_SCREEN];
  const { cards, isLoading } = useEnrichmentCards(config.server);
  const features = config.features as readonly VitanaCardType[];
  const { dismissed, ready, dismiss } = useFeatureCardDismissals(features);

  const entries = useMemo<StripEntry[]>(() => {
    const server = cards
      .filter((c) => isServerCardPlaced(config, c.card_type) && !!CARD_META[c.card_type])
      .map((c) => ({ cardType: c.card_type, title: c.title, description: c.description, params: c.params, server: true }));
    const local = features.filter((type) => !!CARD_META[type] && !dismissed.has(type)).map((type) => ({ cardType: type, server: false }));
    return [...server, ...local].slice(0, STRIP_MAX_CARDS);
  }, [cards, config, features, dismissed]);

  if ((config.server && isLoading) || !ready) return null;
  if (entries.length === 0) return null;

  return (
    <View accessibilityLabel={t('screens.vitanaCards.stripLabel')} testID={`vitana-card-strip-${STRIP_SCREEN}`} style={styles.strip}>
      {entries.map((entry) => (
        <StripCard key={entry.cardType} entry={entry} onDismiss={entry.server ? undefined : () => dismiss(entry.cardType)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 8 },
  card: { borderRadius: 16, borderWidth: 1, borderStartWidth: 4, padding: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orb: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  headerEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  dismiss: { height: 28, width: 28, paddingHorizontal: 0 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  subtext: { marginTop: 2 },
});
