/**
 * Longevity Journey card — replaces the old generic "Priority of the Day"
 * banner slot on the News screen. Always names the actual next Guided
 * Journey session (or a completion message once every session is done)
 * and lands on /autopilot, where the Guided Journey catalog lives.
 *
 * The widget is a compact echo of the My Journey hero card's progress
 * stepper — three real counts from useGuidedJourneyProgress (sessions done
 * in order, the current session, today's goal), not decorative filler.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Play, Zap } from 'lucide-react';
import { useAudiobookPlayer } from '@/context/AudiobookPlayerProvider';
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

function ProgressDot({
  value,
  label,
  className,
}: {
  value: string | number;
  label: string;
  className: string;
}) {
  return (
    <div className="flex w-9 shrink-0 flex-col items-center gap-0">
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold ${className}`}>
        {value}
      </div>
      <span className="text-[6px] font-semibold leading-tight text-muted-foreground text-center line-clamp-1">
        {label}
      </span>
    </div>
  );
}

export function LongevityJourneyCard({ onDismiss }: LongevityJourneyCardProps = {}) {
  const navigate = useNavigate();
  const { totalSessions, completedInOrder, nextSession, completedToday, dailyGoal, loading } =
    useGuidedJourneyProgress();
  const [dismissed, setDismissed] = useState(false);
  const audiobook = useAudiobookPlayer(); // VTID-04763: today's episode, one tap

  if (loading || totalSessions === 0 || dismissed) return null;

  const goToJourney = () => navigate('/autopilot');
  const connector = <span className="w-1.5 border-t border-dashed border-muted-foreground/40" aria-hidden="true" />;

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
      widget={
        nextSession ? (
          <div className="flex items-center gap-0.5">
            <ProgressDot
              value={completedInOrder}
              label={t('screens.home.longevityJourneyDoneLabel')}
              className="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            />
            {connector}
            <ProgressDot
              value={nextSession.session}
              label={t('screens.home.longevityJourneyNowLabel')}
              className="border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 shadow-sm"
            />
            {connector}
            <ProgressDot
              value={`${completedToday}/${dailyGoal}`}
              label={t('screens.home.longevityJourneyGoalLabel')}
              className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            />
          </div>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 shadow-sm">
            <Check className="w-4 h-4 text-white" />
          </div>
        )
      }
    >
      <p className="text-sm font-bold text-violet-700 dark:text-violet-400 leading-tight line-clamp-2">
        {nextSession ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
      </p>
      {nextSession && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {t('screens.home.longevityJourneySubtext', { session: nextSession.session })}
        </p>
      )}
      {nextSession && audiobook ? (
        // VTID-04763: today's episode plays right here — no need to find it
        // on My Journey first. The rest of the card still opens My Journey.
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void audiobook.start({ episode: nextSession.session });
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="mt-1.5 inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          data-testid="home-play-todays-episode"
        >
          <Play className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          <span className="truncate">{t('screens.home.playTodaysEpisode', { session: nextSession.session })}</span>
        </button>
      ) : (
        <VitanaCardActionButton
          className="mt-1.5"
          shape={STYLE.shape}
          accent={STYLE.accent}
          icon={Zap}
          label={t('screens.vitanaIdentity.viewJourney')}
          onClick={goToJourney}
        />
      )}
    </VitanaRecommendationCard>
  );
}
