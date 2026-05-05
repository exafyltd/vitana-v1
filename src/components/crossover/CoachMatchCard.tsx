import { CrossoverCard } from "./CrossoverCard";
import { UserCheck, Calendar, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Badge } from "@/components/ui/badge";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface CoachMatchCardProps {
  className?: string;
}

function CoachMatchCardBase({ className }: CoachMatchCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coaches } = useDemoMatches();

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case "available": return "text-green-600 dark:text-green-400";
      case "tomorrow": return "text-blue-600 dark:text-blue-400";
      default: return "text-yellow-600 dark:text-yellow-400";
    }
  };

  const handleBookCoach = (coachId: string, coachName: string) => {
    if (coachId.startsWith('demo-')) {
      notify('toasts.crossover.bookingStarted');
      return;
    }
    navigate(`/discover/doctors-coaches/${coachId}`);
  };

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('screens.crossover.vettedProfessionalsTailoredYourGoals')}
      </p>
      
      {coaches.map((coach) => (
        <div 
          key={coach.id} 
          className="flex items-center gap-3 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 cursor-pointer group"
          onClick={() => handleBookCoach(coach.id, coach.name)}
        >
          <ClickableAvatar
            userId={coach.user_id}
            handle={coach.handle}
            src={coach.avatar}
            fallback={coach.name.split(' ').map(n => n[0]).join('')}
            alt={coach.name}
            className="w-12 h-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
            disabled={coach.id.startsWith('demo-')}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm truncate">{coach.name}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-xs font-medium">{coach.rating}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground truncate mb-1">{coach.specialty}</p>
            <p className="text-xs font-medium text-primary">from €{coach.sessions_from}</p>
            <p className="text-xs italic text-muted-foreground mt-1 line-clamp-1">"{coach.tagline}"</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-medium ${getAvailabilityColor(coach.availability)}`}>
              {coach.availability}
            </span>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-2xl border border-green-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">{t('screens.crossover.expertHelpAvailable')}</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={UserCheck}
      category="health"
      title={t('screens.crossover.expertHelpers')}
      subtitle="Professional support when you need it"
      content={content}
      buttonText="Book Now"
      onButtonClick={() => navigate('/discover/doctors-coaches')}
      secondaryButtonText="Auto Book"
      onSecondaryButtonClick={() => console.log("Auto booking activated")}
      className={className}
    />
  );
}

export const CoachMatchCard = withCardId(CoachMatchCardBase, "CT-CX-016", "C-016");