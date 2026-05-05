import { CrossoverCard } from "./CrossoverCard";
import { Clock, MapPin, Users, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

interface PrioritySessionCardProps {
  className?: string;
}

function PrioritySessionCardBase({ className }: PrioritySessionCardProps) {
  const navigate = useNavigate();

  // Today's priority session data
  const session = {
    title: "Morning Power Yoga",
    instructor: "Lisa Chen",
    time: "8:00 AM",
    duration: "45 min",
    location: "Wellness Studio A",
    attendees: 12,
    maxAttendees: 15,
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&crop=center",
    priority: "High",
    type: "Mind & Body"
  };

  const content = (
    <div className="relative h-full min-h-[240px] rounded-lg overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${session.imageUrl})` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 p-6 h-full flex flex-col justify-between text-white">
        {/* Header */}
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-0">
            <Star className="w-3 h-3 mr-1" />
            {t('screens.crossover.todaySPriority')}
          </Badge>
          <Badge variant="outline" className="bg-white/20 text-white border-white/30">
            {session.type}
          </Badge>
        </div>
        
        {/* Main Content */}
        <div className="space-y-3">
          <div>
            <h3 className="text-2xl font-bold mb-1">{session.title}</h3>
            <p className="text-white/90 text-sm">with {session.instructor}</p>
          </div>
          
          {/* Session Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>{session.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>{session.attendees}/{session.maxAttendees}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{session.location}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Info */}
        <div className="flex justify-between items-center pt-2 border-t border-white/20">
          <span className="text-xs text-white/80">{t('screens.crossover.starting2Hours')}</span>
          <span className="text-xs text-primary font-medium">{session.duration}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <div 
        className="h-full cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl rounded-lg overflow-hidden"
        onClick={() => navigate('/calendar/events')}
      >
        {content}
      </div>
    </div>
  );
}

export const PrioritySessionCard = withCardId(PrioritySessionCardBase, "CT-CX-011", "C-001");