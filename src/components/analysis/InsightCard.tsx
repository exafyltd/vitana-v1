import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, UserCheck, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DemoPerson, DemoGroup, DemoEvent } from "@/hooks/useDemoMatches";
import { t } from '@/lib/i18n-toast';

interface InsightCardProps {
  type: 'people' | 'groups' | 'events' | 'coaches';
  data?: {
    people?: DemoPerson[];
    group?: DemoGroup;
    events?: DemoEvent[];
    coachType?: string;
  };
}

export function InsightCard({ type, data }: InsightCardProps) {
  const navigate = useNavigate();

  if (type === 'people' && data?.people) {
    return (
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 space-y-3 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-shadow">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20">
            <Users className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{t('screens.analysis.topMatches')}</h3>
            <p className="text-xs text-muted-foreground">{t('screens.analysis.text5PeopleWith70Compatibility')}</p>
          </div>
        </div>
        
        {/* Avatar Stack */}
        <div className="flex -space-x-2 py-2">
          {data.people.slice(0, 5).map((person, index) => (
            <Avatar 
              key={person.id}
              className="w-10 h-10 border-2 border-background ring-2 ring-pink-500/30 hover:ring-pink-500/60 hover:scale-110 transition-all cursor-pointer"
              style={{ zIndex: 5 - index }}
              onClick={() => navigate(`/profile/${person.user_id}`)}
            >
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback>{person.display_name[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/home/matches?tab=people')}
        >
          View All →
        </Button>
      </div>
    );
  }

  if (type === 'groups' && data?.group) {
    return (
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 space-y-3 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-shadow">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
            <Users className="w-5 h-5 text-fuchsia-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{t('screens.analysis.bestGroupFit')}</h3>
            <p className="text-xs text-muted-foreground">{t('screens.analysis.communityWithHighestMatch')}</p>
          </div>
        </div>
        
        {/* Mini Group Banner */}
        <div 
          className="relative rounded-xl overflow-hidden h-24 cursor-pointer group"
          onClick={() => navigate(`/comm/groups/${data.group.id}`)}
        >
          <img 
            src={data.group.image_url || data.group.cover_img} 
            alt={data.group.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
            <div className="text-white text-xs font-medium line-clamp-1">{data.group.name}</div>
          </div>
          <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">
            {data.group.compatibility_score}%
          </Badge>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate(`/comm/groups/${data.group.id}`)}
        >
          Explore →
        </Button>
      </div>
    );
  }

  if (type === 'events' && data?.events) {
    return (
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 space-y-3 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-shadow">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{t('screens.analysis.eventFit')}</h3>
            <p className="text-xs text-muted-foreground">{t('screens.analysis.next3EventsAlignedYou')}</p>
          </div>
        </div>
        
        {/* Mini Event Thumbnails */}
        <div className="grid grid-cols-3 gap-2">
          {data.events.slice(0, 3).map(event => (
            <div 
              key={event.id}
              className="relative rounded-lg overflow-hidden aspect-square cursor-pointer hover:scale-105 transition-transform group"
              onClick={() => navigate(`/community/events/${event.id}`)}
            >
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/home/matches?tab=events')}
        >
          View Schedule →
        </Button>
      </div>
    );
  }

  if (type === 'coaches') {
    const coachType = data?.coachType || "Wellness & Mindfulness";
    return (
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-5 space-y-3 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-shadow">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
            <UserCheck className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{t('screens.analysis.coachFit')}</h3>
            <p className="text-xs text-muted-foreground">{t('screens.analysis.recommendedCoachType')}</p>
          </div>
        </div>
        
        {/* Coach Type Icon + Description */}
        <div className="text-center space-y-2 py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
            <Heart className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">{coachType}</p>
            <p className="text-xs text-muted-foreground">{t('screens.analysis.basedYourGoals')}</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/home/matches?tab=coaches')}
        >
          Find Coaches →
        </Button>
      </div>
    );
  }

  return null;
}
