import { CrossoverCard } from "./CrossoverCard";
import { Users, MessageCircle, Calendar, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface SocialContextCardProps {
  activeFriends?: number;
  scheduledMeetings?: number;
  groupActivities?: number;
  supportMessages?: number;
  className?: string;
}

function SocialContextCardBase({ 
  activeFriends = 8,
  scheduledMeetings = 3,
  groupActivities = 2,
  supportMessages = 5,
  className 
}: SocialContextCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <div>
            <div className="font-medium">{activeFriends}</div>
            <div className="text-xs text-muted-foreground">{t('screens.crossover.friendsActive')}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <div>
            <div className="font-medium">{scheduledMeetings}</div>
            <div className="text-xs text-muted-foreground">{t('screens.crossover.meetingsToday')}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-green-600" />
          <span>{t('screens.crossover.supportmessagesSupportMsgs', { supportMessages })}</span>
        </div>
        <div className="flex items-center gap-1">
          <Heart className="w-3 h-3 text-red-500" />
          <span>{t('screens.crossover.groupactivitiesGroupActivities', { groupActivities })}</span>
        </div>
      </div>

      <div className="p-2 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t('screens.crossover.highSocialEnergyToday')}</p>
          <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Users}
      category="community"
      title={t('screens.crossover.socialContext')}
      subtitle="Friends, meetings & group activities"
      content={content}
      buttonText="Join Friends"
      onButtonClick={() => navigate('/community/live-interaction')}
      secondaryButtonText="View Calendar"
      onSecondaryButtonClick={() => navigate('/calendar')}
      className={className}
    />
  );
}

export const SocialContextCard = withCardId(SocialContextCardBase, "CT-CX-015", "C-015");