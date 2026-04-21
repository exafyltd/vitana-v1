import { useNavigate } from 'react-router-dom';
import { useDailyPriority } from '@/hooks/useDailyPriority';
import { useProactivePriority } from '@/hooks/useProactivePriority';
import { useProfile } from '@/context/ProfileProvider';
import { ArrowRight } from 'lucide-react';

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

  const firstName = profile?.displayName?.split(' ')[0] || 'there';

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

  const Icon = effective.icon;

  const handleClick = () => {
    navigate(effective.actionLink);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r ${effective.color} p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-primary/40 animate-fade-in`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {effective.isProactive ? 'For you, right now' : 'Priority of the Day::'}
            </span>
            <span className="text-base font-bold text-foreground">
              {effective.isProactive
                ? effective.message
                : `${effective.message}, ${firstName}!`}
            </span>
          </div>
          {effective.actionText && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {effective.actionText}
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
