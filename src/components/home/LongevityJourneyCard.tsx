/**
 * Longevity Journey card — replaces the old generic "Priority of the Day"
 * banner slot on the News screen. Always names the actual next Guided
 * Journey session (or a completion message once every session is done)
 * and lands on /autopilot, where the Guided Journey catalog lives.
 *
 * VTID-05143: on the Unified Card System shell like every other card — the
 * action button (play today's episode, or open My Journey) sits in the widget
 * slot. The three real counts from useGuidedJourneyProgress (sessions done in
 * order, the current session, today's goal) that used to be a stepper graphic
 * are now part of the subtext, so nothing is lost and the card stays 138 px.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useGuidedMode } from '@/context/GuidedModeProvider';
import { useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';
import { VitanaCardActionButton } from '@/components/vitana/VitanaCardActionButton';
import { ACCENT_CLASSES, CARD_STYLE } from '@/components/vitana/vitana-card-catalog';

const STYLE = CARD_STYLE.F1; // VTID-05086: Unified Card System accent + button shape

export interface LongevityJourneyCardProps {
  /** VTID-05086: undefined = hide for this view; function = called on X; null = no X (chat). */
  onDismiss?: (() => void) | null;
}

export function LongevityJourneyCard({ onDismiss }: LongevityJourneyCardProps = {}) {
  const navigate = useNavigate();
  const { totalSessions, completedInOrder, nextSession, completedToday, dailyGoal, loading } =
    useGuidedJourneyProgress();
  const [dismissed, setDismissed] = useState(false);
  const { setMode } = useGuidedMode();

  if (loading || totalSessions === 0 || dismissed) return null;

  const goToJourney = () => navigate('/autopilot');
  // The button opens My Journey on the next episode in the catalog, so the member sees which
  // episode it is. It does not start audio from inside the chat or the news feed.
  const goToNextEpisode = () => {
    if (!nextSession) return goToJourney();
    void setMode('guided'); // the episode catalog is shown in guided mode
    navigate(`/autopilot#guided-session-${nextSession.session}`);
  };

  return (
    <VitanaRecommendationCard
      feature="guided-journey"
      eyebrow={t('screens.home.longevityJourneyEyebrow')}
      onOpen={goToJourney}
      onDismiss={
        onDismiss === null
          ? undefined
          : () => {
              onDismiss?.();
              setDismissed(true);
            }
      }
      dismissLabel={t('screens.vitanaIdentity.dismissCard')}
      accentClassName={ACCENT_CLASSES[STYLE.accent].border}
      widgetInteractive
      widget={
        <VitanaCardActionButton
          shape={STYLE.shape}
          accent={STYLE.accent}
          icon={Zap}
          label={t('screens.vitanaIdentity.viewJourney')}
          onClick={goToNextEpisode}
          data-testid="home-open-next-episode"
        />
      }
    >
      <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
        {nextSession ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
      </p>
      {nextSession && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {t('screens.home.longevityJourneyProgressSubtext', {
            session: nextSession.session,
            done: completedInOrder,
            today: completedToday,
            goal: dailyGoal,
          })}
        </p>
      )}
    </VitanaRecommendationCard>
  );
}
