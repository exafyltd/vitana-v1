import { UserCheck } from "lucide-react";
import { CoachCard } from "./CoachCard";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useNavigate } from "react-router-dom";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

export function CoachDirectoryGrid() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coaches } = useDemoMatches();

  const handleBookCoach = (coachId: string, coachName: string) => {
    if (coachId.startsWith('demo-')) {
      notify('toasts.coaches.bookingStarted');
      return;
    }
    navigate(`/discover/doctors-coaches/${coachId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-pink-600" />
            {t('screens.coaches.expertHelpers')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('screens.coaches.vettedProfessionalsTailoredYourGoals')}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {coaches.map(coach => (
          <CoachCard 
            key={coach.id} 
            coach={coach} 
            onBook={handleBookCoach} 
          />
        ))}
      </div>
    </div>
  );
}
