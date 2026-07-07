/**
 * Longevity Journey card — replaces the old generic "Priority of the Day"
 * banner slot on the News screen. Always names the actual next Guided
 * Journey session (or a completion message once every session is done)
 * and lands on /autopilot, where the Guided Journey catalog lives.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useGuidedJourneyProgress } from '@/hooks/useGuidedJourneyProgress';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationHeader } from '@/components/vitana/VitanaRecommendationHeader';

export function LongevityJourneyCard() {
  const navigate = useNavigate();
  const { totalSessions, nextSession, loading } = useGuidedJourneyProgress();
  const [dismissed, setDismissed] = useState(false);

  if (loading || totalSessions === 0 || dismissed) return null;

  const goToJourney = () => navigate('/autopilot');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToJourney}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToJourney();
        }
      }}
      className="w-full group relative overflow-hidden rounded-xl border border-indigo-300/30 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 p-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg animate-fade-in text-left cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <button
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
        aria-label={t('screens.vitanaIdentity.dismissCard')}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative">
        <VitanaRecommendationHeader feature="guided-journey" className="pr-6 mb-2" />

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
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
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
              {t('screens.vitanaIdentity.viewJourney')}
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          {/*
            Small callback to the My Journey hero card's "current session"
            ring — same purple/indigo glow, just the session number. Purely
            decorative, no new copy.
          */}
          {nextSession && (
            <div
              className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 shadow-sm"
              aria-hidden="true"
            >
              <span className="text-sm font-bold leading-none text-white">{nextSession.session}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
