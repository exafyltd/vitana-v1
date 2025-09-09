import { CrossoverCard } from "./CrossoverCard";
import { Users, Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PeopleMatchCardProps {
  matches?: Array<{
    id: string;
    name: string;
    avatar: string;
    description: string;
    compatibility: number;
  }>;
  className?: string;
}

function PeopleMatchCardBase({ 
  matches = [
    { id: "1", name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg", description: "Yoga enthusiast", compatibility: 92 },
    { id: "2", name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg", description: "Fitness coach", compatibility: 88 },
    { id: "3", name: "Emma Wilson", avatar: "/lovable-uploads/emma-wilson-avatar.jpg", description: "Meditation teacher", compatibility: 85 }
  ],
  className 
}: PeopleMatchCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      {matches.map((match) => (
        <div key={match.id} className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg">
          <Avatar className="w-8 h-8">
            <AvatarImage src={match.avatar} />
            <AvatarFallback>{match.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm truncate">{match.name}</p>
              <Badge variant="secondary" className="text-xs">{match.compatibility}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{match.description}</p>
          </div>
          <MessageCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </div>
      ))}

      <div className="mt-4 p-2 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ready for connections</span>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Users}
      category="mental"
      title="Top People 👋"
      subtitle="High compatibility matches"
      content={content}
      buttonText="Say Hi"
      onButtonClick={() => navigate('/messages/direct')}
      secondaryButtonText="Auto Intro"
      onSecondaryButtonClick={() => console.log("Auto intro activated")}
      className={className}
    />
  );
}

export const PeopleMatchCard = withCardId(PeopleMatchCardBase, "CT-CX-014", "C-014");