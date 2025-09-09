import { CrossoverCard } from "./CrossoverCard";
import { Users2, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";

interface GroupMatchCardProps {
  groups?: Array<{
    id: string;
    name: string;
    location: string;
    time: string;
    members: number;
    type: "trending" | "new" | "weekly";
  }>;
  className?: string;
}

function GroupMatchCardBase({ 
  groups = [
    { id: "1", name: "Morning Runners Club", location: "Central Park", time: "7:00 AM", members: 15, type: "trending" },
    { id: "2", name: "Healthy Cooking Class", location: "Downtown Kitchen", time: "6:00 PM", members: 8, type: "new" },
    { id: "3", name: "Mindfulness Group", location: "Wellness Center", time: "7:30 PM", members: 12, type: "weekly" }
  ],
  className 
}: GroupMatchCardProps) {
  const navigate = useNavigate();

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "trending": return "default";
      case "new": return "secondary";  
      case "weekly": return "outline";
      default: return "outline";
    }
  };

  const content = (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.id} className="p-2 bg-secondary/20 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm leading-tight">{group.name}</h4>
            <Badge variant={getBadgeVariant(group.type)} className="text-xs capitalize">
              {group.type}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{group.location}</span>
              <Clock className="w-3 h-3 ml-2" />
              <span>{group.time}</span>
            </div>
            <p>{group.members} members {group.type === 'new' ? 'spots left' : 'joining'}</p>
          </div>
        </div>
      ))}

      <div className="mt-4 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Perfect for your interests</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Users2}
      category="mental"
      title="Groups & Events 🎉"
      subtitle="Join communities that match your vibe"
      content={content}
      buttonText="Join Group"
      onButtonClick={() => navigate('/community/groups')}
      secondaryButtonText="Auto RSVP"
      onSecondaryButtonClick={() => console.log("Auto RSVP activated")}
      className={className}
    />
  );
}

export const GroupMatchCard = withCardId(GroupMatchCardBase, "CT-CX-015", "C-015");