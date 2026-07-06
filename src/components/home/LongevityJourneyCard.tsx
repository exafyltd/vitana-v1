/**
 * Longevity Journey card — replaces the old generic "Priority of the Day"
 * banner slot on the News screen. Always names the actual next Guided
 * Journey session (or a completion message once every session is done)
 * and lands on /autopilot, where the Guided Journey catalog lives.
 */

import { useNavigate } from 'react-router-dom';
import { useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationHeader } from '@/components/vitana/VitanaRecommendationHeader';

export function LongevityJourneyCard() {
  const navigate = useNavigate();
  const { totalSessions, nextSession, loading } = useGuidedJourneyProgress();

  if (loading || totalSessions === 0) return null;

  return (
    <button
      onClick={() => navigate('/autopilot')}
      className="w-full group relative overflow-hidden rounded-xl border border-indigo-300/30 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 p-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg animate-fade-in text-left"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        <VitanaRecommendationHeader label="vitana" showForYouBadge className="mb-2" />

        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('screens.home.longevityJourneyEyebrow')}
        </span>
        <p className="text-base font-bold text-foreground">
          {nextSession
            ? t('screens.home.longevityJourneyContinue', {
                session: nextSession.session,
                topic: nextSession.topic.displayLabel,
              })
            : t('screens.home.longevityJourneyAllDone')}
        </p>
      </div>
    </button>
  );
}
