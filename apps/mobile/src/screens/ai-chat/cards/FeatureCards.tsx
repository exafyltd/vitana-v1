/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the three static feature
 * cards the web strip places on Talk to Vitana (`CARD_SCREENS['talk-to-vitana']
 * .features` = F1, F2, F3; `card-registry.tsx`):
 *
 * - F1 `LongevityJourneyCard` — the next Guided Journey episode (or "all
 *   done"), its progress subtext, "View My Journey" → `/autopilot`. The web's
 *   "Play episode N" button only renders inside the web AudiobookPlayerProvider
 *   (`useAudiobookPlayer()` is null without it); the native app has no
 *   audiobook player, so the card takes the web's own no-player branch.
 * - F2 `VitanaIndexCard` — trend headline + score subtext; "View Index" opens
 *   the Vitana Index overlay (`vitana:open-index` on the bus, the web event);
 *   with no native overlay registered it goes to `/health/vitana-index`, the
 *   page the web header opens for the same Index.
 * - F3 `DailyDiaryCard` — catalog copy (or the server's), "Record" →
 *   `/daily-diary`.
 *
 * F1 and F2 render nothing while loading or without data, like the web.
 */
import type { ReactElement } from 'react';
import { useUITheme } from '../../../ports/ui';
import { AiChatIcon } from '../../../ports/ai-chat';
import { CARD_DEEP_LINKS } from '../../../ports/feed';
import { navigateToWebPath } from '../../../navigation/navigate';
import { overlayBus } from '../../../navigation/overlay-bus';
import { useI18n } from '../../../i18n/I18nProvider';
import { FeatureCardShell } from './FeatureCardShell';
import { useGuidedJourneyProgress } from '../data/journey';
import { useVitanaIndex, weeklyChangePct } from '../data/vitana-index';

export type FeatureCardProps = { title?: string; description?: string; onDismiss?: () => void };

/** The web's VITANA_INDEX_OPEN_EVENT (`VitanaIndexSheet.tsx`). */
export const VITANA_INDEX_OPEN_EVENT = 'vitana:open-index';

function go(type: 'F1' | 'F3'): () => void {
  return () => {
    const to = CARD_DEEP_LINKS[type];
    if (to) navigateToWebPath(to);
  };
}

export function LongevityJourneyCard({ onDismiss }: FeatureCardProps): ReactElement | null {
  const { t } = useI18n();
  const { totalSessions, completedInOrder, nextSession, completedToday, dailyGoal, loading } = useGuidedJourneyProgress();
  if (loading || totalSessions === 0) return null;
  const open = go('F1');
  return (
    <FeatureCardShell
      cardType="F1"
      badgeIcon="Zap"
      badgeLabelKey="screens.vitanaIdentity.guidedJourney"
      eyebrow={t('screens.home.longevityJourneyEyebrow')}
      headline={nextSession ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
      subtext={
        nextSession
          ? t('screens.home.longevityJourneyProgressSubtext', { session: nextSession.session, done: completedInOrder, today: completedToday, goal: dailyGoal })
          : null
      }
      actionIcon="Zap"
      actionLabel={t('screens.vitanaIdentity.viewJourney')}
      onAction={open}
      onOpen={open}
      onDismiss={onDismiss}
    />
  );
}

const TREND = {
  up: { icon: 'TrendingUp', headlineKey: 'screens.home.vitanaIndexUpHeadline', subtextKey: 'screens.home.vitanaIndexUpSubtext' },
  down: { icon: 'TrendingDown', headlineKey: 'screens.home.vitanaIndexDownHeadline', subtextKey: 'screens.home.vitanaIndexDownSubtext' },
  stable: { icon: 'Minus', headlineKey: 'screens.home.vitanaIndexStableHeadline', subtextKey: 'screens.home.vitanaIndexStableSubtext' },
} as const;

export function openVitanaIndex(): void {
  if (overlayBus.listenerCount(VITANA_INDEX_OPEN_EVENT) > 0) overlayBus.emit(VITANA_INDEX_OPEN_EVENT);
  else navigateToWebPath('/health/vitana-index');
}

export function VitanaIndexCard({ onDismiss }: FeatureCardProps): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { index, isLoading } = useVitanaIndex();
  if (isLoading || !index) return null;
  const style = TREND[index.trend];
  const pct = Math.abs(weeklyChangePct(index.history));
  const tint = index.trend === 'up' ? colors.statusSuccess : index.trend === 'down' ? colors.statusWarning : colors.foreground;
  return (
    <FeatureCardShell
      cardType="F2"
      badgeIcon="Activity"
      badgeLabelKey="screens.vitanaIdentity.vitanaIndex"
      eyebrow={t('screens.home.vitanaIndexEyebrow')}
      headline={
        <>
          <AiChatIcon name={style.icon} size={14} color={tint} />{' '}
          {t(style.headlineKey, { pct })}
        </>
      }
      subtext={t('screens.home.vitanaIndexScoreSubtext', { score: new Intl.NumberFormat(locale).format(index.total), message: t(style.subtextKey) })}
      actionIcon="HeartPulse"
      actionLabel={t('screens.vitanaIdentity.viewIndex')}
      onAction={openVitanaIndex}
      onOpen={openVitanaIndex}
      onDismiss={onDismiss}
    />
  );
}

export function DailyDiaryCard({ title, description, onDismiss }: FeatureCardProps): ReactElement {
  const { t } = useI18n();
  const open = go('F3');
  return (
    <FeatureCardShell
      cardType="F3"
      badgeIcon="Mic"
      badgeLabelKey="screens.vitanaIdentity.dailyDiary"
      eyebrow={t('screens.vitanaCards.F3.eyebrow')}
      headline={title?.trim() || t('screens.vitanaCards.F3.title')}
      subtext={description?.trim() || t('screens.vitanaCards.F3.description')}
      actionIcon="Mic"
      actionLabel={t('screens.vitanaCards.F3.action')}
      onAction={open}
      onOpen={open}
      onDismiss={onDismiss}
    />
  );
}

/** The feature cards this screen's strip can show (web `VITANA_CARD_REGISTRY` F1–F3). */
export const FEATURE_CARDS: Partial<Record<string, (props: FeatureCardProps) => ReactElement | null>> = {
  F1: LongevityJourneyCard,
  F2: VitanaIndexCard,
  F3: DailyDiaryCard,
};
