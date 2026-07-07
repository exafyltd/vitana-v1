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
import { ArrowRight, Check } from 'lucide-react';
import { useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationCard } from '@/components/vitana/VitanaRecommendationCard';

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
    <div className="flex w-11 shrink-0 flex-col items-center gap-0.5">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${className}`}>
        {value}
      </div>
      <span className="text-[7px] font-semibold leading-tight text-muted-foreground text-center line-clamp-1">
        {label}
      </span>
    </div>
  );
}

export function LongevityJourneyCard() {
  const navigate = useNavigate();
  const { totalSessions, completedInOrder, nextSession, completedToday, dailyGoal, loading } =
    useGuidedJourneyProgress();
  const [dismissed, setDismissed] = useState(false);

  if (loading || totalSessions === 0 || dismissed) return null;

  const goToJourney = () => navigate('/autopilot');
  const connector = <span className="w-2.5 border-t border-dashed border-muted-foreground/40" aria-hidden="true" />;

  return (
    <VitanaRecommendationCard
      feature="guided-journey"
      accent="indigo"
      eyebrow={t('screens.home.longevityJourneyEyebrow')}
      onOpen={goToJourney}
      onDismiss={() => setDismissed(true)}
      dismissLabel={t('screens.vitanaIdentity.dismissCard')}
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 shadow-sm">
            <Check className="w-5 h-5 text-white" />
          </div>
        )
      }
    >
      <p className="text-base font-bold text-violet-700 dark:text-violet-400 leading-snug line-clamp-2">
        {nextSession ? t('screens.home.longevityJourneyNextStepHeadline') : t('screens.home.longevityJourneyAllDone')}
      </p>
      {nextSession && (
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
          {t('screens.home.longevityJourneySubtext', { session: nextSession.session })}
        </p>
      )}
      <span className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
        <span className="truncate">{t('screens.vitanaIdentity.viewJourney')}</span>
        <ArrowRight className="w-3 h-3 shrink-0" />
      </span>
    </VitanaRecommendationCard>
  );
}
