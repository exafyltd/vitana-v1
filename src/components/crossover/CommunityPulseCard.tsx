import { CrossoverCard } from "./CrossoverCard";
import { Users, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommunityPulseCardProps {
  activeUsers?: number;
  newInvites?: number;
  upcomingEvents?: number;
  className?: string;
}

export function CommunityPulseCard({ 
  activeUsers = 12,
  newInvites = 2,
  upcomingEvents = 1,
  className 
}: CommunityPulseCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-2 text-center">
      <div className="flex items-center justify-center gap-1 text-sm">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="font-medium">{activeUsers} friends active</span>
      </div>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        {newInvites > 0 && (
          <div className="flex items-center justify-center gap-1">
            <MessageCircle className="w-3 h-3" />
            <span>{newInvites} new invite{newInvites !== 1 ? 's' : ''}</span>
          </div>
        )}
        {upcomingEvents > 0 && (
          <p>Group event tonight</p>
        )}
      </div>
    </div>
  );

  const handleJoinActivity = () => {
    // In real implementation, this would show active sessions or activities
    navigate('/community/live-interaction');
  };

  return (
    <CrossoverCard
      icon={Users}
      category="community"
      title="Community Activity"
      subtitle="Connect with friends and join wellness activities"
      content={content}
      buttonText="Join Activity"
      onButtonClick={handleJoinActivity}
      secondaryButtonText="View Community"
      onSecondaryButtonClick={() => navigate('/community')}
      className={className}
    />
  );
}