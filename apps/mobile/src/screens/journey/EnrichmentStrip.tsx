/**
 * VTID-05461 — My Journey's Unified Card System strip
 * (`<EnrichmentCardStrip screen="autopilot" />`, AutopilotDashboard.tsx:428;
 * EnrichmentCardStrip.tsx:70-121), stacked, `maxCards = 3`:
 *  - server cards first: the gateway's enrichment / boost cards for the
 *    `autopilot` screen that the catalog places there
 *    (`isServerCardPlaced(CARD_SCREENS.autopilot)`, boost G3 only), drawn with
 *    the home lane's native card (read-only import) and its server dismiss;
 *  - then the screen's static feature cards `CARD_SCREENS.autopilot.features`
 *    (F1 Longevity Journey, F2 Vitana Index, F3 Daily Diary, F9 Calendar) the
 *    member has not hidden on this device: the X stores
 *    `vitana.card.<type>.dismissed_at` (native key-value store) and the card
 *    stays hidden for 7 days (useCardDismiss.ts:28-56; a failed write is kept
 *    in memory for the session);
 *  - nothing while the server cards load, or when no entry is left.
 * The feature cards are twins of `components/home/LongevityJourneyCard.tsx`,
 * `components/home/VitanaIndexCard.tsx` and `components/feature/{DailyDiaryCard,CalendarCard}.tsx`
 * (FeatureCards.tsx).
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View } from 'react-native';
import { CARD_SCREENS, isServerCardPlaced, type VitanaCardType } from '../../ports/feed';
import { FEATURE_CARD_DISMISS_TTL_MS, featureCardDismissKey } from '../../ports/journey';
import { useEnrichmentCards } from '../home/data/enrichment';
import { EnrichmentCard } from '../home/cards/EnrichmentCard';
import { useI18n } from '../../i18n/I18nProvider';
import { FEATURE_CARDS } from './FeatureCards';

const MAX_CARDS = 3;
const sessionDismissedAt = new Map<VitanaCardType, number>();
const withinTtl = (at: number, now: number) => Number.isFinite(at) && now - at < FEATURE_CARD_DISMISS_TTL_MS;

async function readHidden(types: readonly VitanaCardType[]): Promise<Set<VitanaCardType>> {
  const now = Date.now();
  const hidden = new Set<VitanaCardType>();
  await Promise.all(
    types.map(async (type) => {
      const inSession = sessionDismissedAt.get(type);
      if (inSession !== undefined && withinTtl(inSession, now)) {
        hidden.add(type);
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(featureCardDismissKey(type));
        if (raw && withinTtl(Number(raw), now)) hidden.add(type);
      } catch {
        /* storage unavailable — show the card */
      }
    }),
  );
  return hidden;
}

async function rememberHidden(type: VitanaCardType): Promise<void> {
  const now = Date.now();
  try {
    await AsyncStorage.setItem(featureCardDismissKey(type), String(now));
    sessionDismissedAt.delete(type);
  } catch {
    sessionDismissedAt.set(type, now);
  }
}

/** Test-only: forget the in-memory fallback. */
export function __resetFeatureCardDismissMemory(): void {
  sessionDismissedAt.clear();
}

export function EnrichmentStrip(): ReactElement | null {
  const { t } = useI18n();
  const config = CARD_SCREENS.autopilot;
  const { cards, isLoading, dismiss } = useEnrichmentCards(config.server ?? null);
  const features = config.features as VitanaCardType[];
  const [hidden, setHidden] = useState<Set<VitanaCardType> | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    void readHidden(features).then((h) => {
      if (alive) setHidden(h);
    });
    return () => {
      alive = false;
    };
  }, [features, version]);

  const entries = useMemo(() => {
    const server = cards.filter((c) => isServerCardPlaced(config, c.card_type)).map((c) => ({ type: c.card_type, server: c }));
    const local = features.filter((type) => FEATURE_CARDS[type] && !hidden?.has(type)).map((type) => ({ type, server: null }));
    return [...server, ...local].slice(0, MAX_CARDS);
  }, [cards, config, features, hidden]);

  if ((config.server && isLoading) || hidden === null) return null;
  if (entries.length === 0) return null;
  return (
    <View style={styles.strip} accessibilityLabel={t('screens.vitanaCards.stripLabel')} testID="vitana-card-strip-autopilot">
      {entries.map((e) => {
        if (e.server) return <EnrichmentCard key={e.type} card={e.server} onDismiss={dismiss} />;
        const Card = FEATURE_CARDS[e.type] as NonNullable<(typeof FEATURE_CARDS)[VitanaCardType]>;
        return (
          <Card
            key={e.type}
            onDismiss={() => {
              void rememberHidden(e.type).then(() => setVersion((v) => v + 1));
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ strip: { gap: 8 } });
