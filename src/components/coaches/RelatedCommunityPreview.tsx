import { Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

export function RelatedCommunityPreview() {
  const navigate = useNavigate();
  const { groups, events } = useDemoMatches();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Groups Preview */}
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10 p-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-600" />
          {t('screens.coaches.relatedGroups')}
        </h3>
        
        <div className="space-y-2 mb-4">
          {groups.slice(0, 3).map(group => (
            <div 
              key={group.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-white/5"
              onClick={() => navigate(`/comm/groups/${group.id}`)}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={group.image_url || group.cover_img} 
                  alt={group.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.member_count} members
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full" 
          onClick={() => navigate('/home/matches?tab=groups')}
        >
          {t('screens.coaches.exploreMoreGroups')}
        </Button>
      </div>
      
      {/* Events Preview */}
      <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10 p-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-fuchsia-600" />
          {t('screens.coaches.upcomingEvents')}
        </h3>
        
        <div className="space-y-2 mb-4">
          {events.slice(0, 3).map(event => (
            <div 
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-white/5"
              onClick={() => navigate(`/community/events/${event.id}`)}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={event.image_url} 
                  alt={event.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.participant_count} attending
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full" 
          onClick={() => navigate('/home/matches?tab=events')}
        >
          {t('screens.coaches.exploreMoreEvents')}
        </Button>
      </div>
    </div>
  );
}
