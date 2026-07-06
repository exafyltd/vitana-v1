import { useNavigate } from 'react-router-dom';
import { useDailyPriority } from '@/hooks/useDailyPriority';
import { useProactivePriority } from '@/hooks/useProactivePriority';
import { useProfile } from '@/context/ProfileProvider';
import { ArrowRight } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { VitanaRecommendationHeader } from '@/components/vitana/VitanaRecommendationHeader';

interface PriorityOfDayBannerProps {
  vitanaBreakdown?: any;
}

export function PriorityOfDayBanner({ vitanaBreakdown }: PriorityOfDayBannerProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const deterministicPriority = useDailyPriority(vitanaBreakdown);
  // VTID-01947 Phase H.2 — awareness-driven priority, falls back to
  // deterministic rotation when the backend returns null (suppressed by
  // pause or endpoint unavailable).
  const { priority: proactivePriority } = useProactivePriority();

  const firstName = profile?.displayName?.split(' ')[0] || t('screens.home.thereFallbackName');

  const effective = proactivePriority
    ? {
        // Proactive path — backend message is the full sentence; no firstName
        // suffix, no separate actionText subtitle.
        isProactive: true as const,
        message: proactivePriority.message,
        actionText: '',
        actionLink: proactivePriority.actionLink,
        icon: proactivePriority.icon,
        color: proactivePriority.color,
      }
    : {
        // Legacy path — deterministic rotation
        isProactive: false as const,
        message: deterministicPriority.message,
        actionText: deterministicPriority.actionText,
        actionLink: deterministicPriority.actionLink,
        icon: deterministicPriority.icon,
        color: deterministicPriority.color,
      };

  const handleClick = () => {
    navigate(effective.actionLink);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r ${effective.color} p-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-primary/40 animate-fade-in text-left`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        <VitanaRecommendationHeader feature="guided-journey" className="mb-2" />

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {effective.isProactive ? t('screens.home.forYouRightNow') : t('screens.home.priorityOfTheDay')}
          </span>
          <span className="text-base font-bold text-foreground">
            {effective.isProactive
              ? effective.message
              : `${effective.message}, ${firstName}!`}
          </span>
        </div>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
          {t('screens.vitanaIdentity.viewJourney')}
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}
