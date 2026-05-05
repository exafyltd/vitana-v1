import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { DemoCoach } from "@/hooks/useDemoMatches";
import { t } from '@/lib/i18n-toast';

interface CoachCardProps {
  coach: DemoCoach;
  onBook: (coachId: string, coachName: string) => void;
}

export function CoachCard({ coach, onBook }: CoachCardProps) {
  const getAvailabilityDotColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case "available": 
        return "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]";
      case "tomorrow": 
        return "bg-blue-500";
      default: 
        return "bg-yellow-500";
    }
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_40px_rgba(236,72,153,0.3)] transition-all duration-300 p-5"
    >
      {/* Availability Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${getAvailabilityDotColor(coach.availability)}`} />
      </div>
      
      {/* Coach Avatar */}
      <ClickableAvatar
        userId={coach.user_id}
        handle={coach.handle}
        src={coach.avatar}
        fallback={coach.name.split(' ').map(n => n[0]).join('')}
        alt={coach.name}
        className="w-20 h-20 mx-auto mb-4 ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-110 transition-all"
        disabled={coach.id.startsWith('demo-')}
      />
      
      {/* Coach Info */}
      <div className="text-center space-y-2">
        <h4 className="font-semibold text-base">{coach.name}</h4>
        
        <div className="flex items-center justify-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          <span className="text-sm font-medium">{coach.rating}</span>
        </div>
        
        <p className="text-sm text-muted-foreground">{coach.specialty}</p>
        
        <p className="text-xs italic text-muted-foreground/80 line-clamp-2 min-h-[32px] px-2">
          "{coach.tagline}"
        </p>
        
        <div className="pt-3 border-t border-border/50 space-y-2">
          <p className="text-sm font-medium text-primary">{t('screens.coaches.fromSessions_from', { sessions_from: coach.sessions_from })}</p>
          <Button 
            size="sm" 
            className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 shadow-md hover:shadow-lg transition-all"
            onClick={() => onBook(coach.id, coach.name)}
          >{t('screens.coaches.bookSession')}
          </Button>
        </div>
      </div>
    </div>
  );
}
