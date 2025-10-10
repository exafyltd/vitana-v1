import { useNavigate } from 'react-router-dom';
import { useDailyPriority } from '@/hooks/useDailyPriority';
import { useProfile } from '@/context/ProfileProvider';
import { ArrowRight } from 'lucide-react';

interface PriorityOfDayBannerProps {
  vitanaBreakdown?: any;
}

export function PriorityOfDayBanner({ vitanaBreakdown }: PriorityOfDayBannerProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const priority = useDailyPriority(vitanaBreakdown);
  
  const firstName = profile?.displayName?.split(' ')[0] || 'there';
  const Icon = priority.icon;

  const handleClick = () => {
    navigate(priority.actionLink);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-r ${priority.color} p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-primary/40 animate-fade-in`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 text-left">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Priority of the Day::
            </span>
            <span className="text-xl font-bold text-foreground">
              {priority.message}, {firstName}!
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            {priority.actionText}
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </p>
        </div>
      </div>
    </button>
  );
}
