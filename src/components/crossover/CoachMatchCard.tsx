import { CrossoverCard } from "./CrossoverCard";
import { UserCheck, Calendar, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface CoachMatchCardProps {
  coaches?: Array<{
    id: string;
    name: string;
    avatar: string;
    specialty: string;
    availability: string;
    rating: number;
  }>;
  className?: string;
}

function CoachMatchCardBase({ 
  coaches = [
    { id: "1", name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg", specialty: "Primary Care", availability: "Available", rating: 4.9 },
    { id: "2", name: "Mike Thompson", avatar: "/lovable-uploads/mike-thompson-avatar.jpg", specialty: "Personal Trainer", availability: "Next week", rating: 4.8 },
    { id: "3", name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg", specialty: "Life Coach", availability: "Tomorrow", rating: 5.0 }
  ],
  className 
}: CoachMatchCardProps) {
  const navigate = useNavigate();

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case "available": return "text-green-600";
      case "tomorrow": return "text-blue-600";
      default: return "text-yellow-600";
    }
  };

  const content = (
    <div className="space-y-3">
      {coaches.map((coach) => (
        <div key={coach.id} className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg">
          <Avatar className="w-8 h-8">
            <AvatarImage src={coach.avatar} />
            <AvatarFallback>{coach.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm truncate">{coach.name}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-xs">{coach.rating}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate">{coach.specialty}</p>
              <span className={`text-xs font-medium ${getAvailabilityColor(coach.availability)}`}>
                {coach.availability}
              </span>
            </div>
          </div>
          <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </div>
      ))}

      <div className="mt-4 p-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Expert help available</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={UserCheck}
      category="health"
      title="Expert Helpers 🧑‍⚕️"
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