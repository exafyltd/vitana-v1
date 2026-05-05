import { Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

export function ContinueConnectingFeed() {
  const navigate = useNavigate();
  const { groups, events } = useDemoMatches();

  // Mix groups and events, sorted by compatibility/match score
  const mixedContent = [
    ...groups.slice(0, 4).map(g => ({ 
      ...g, 
      type: 'group' as const,
      link: `/community/groups/${g.id}`,
      title: g.name,
      description: g.description,
      match_score: g.compatibility_score,
      member_count: g.member_count
    })),
    ...events.slice(0, 4).map(e => ({ 
      ...e, 
      type: 'event' as const,
      link: `/community/events/${e.id}`,
      title: e.title,
      description: e.location,
      match_score: Math.round(e.match_score * 100),
      member_count: e.participant_count,
      category: e.event_type,
      image_url: e.image_url
    }))
  ].sort((a, b) => b.match_score - a.match_score);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-600" />
          {t('screens.analysis.continueConnecting')}
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/discover')}
          className="text-xs"
        >
          {t('screens.analysis.exploreAll')}
        </Button>
      </div>
      
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {mixedContent.map(item => (
            <div 
              key={item.id}
              className="flex-shrink-0 w-64 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all cursor-pointer group"
              onClick={() => navigate(item.link)}
            >
              {/* Category Badge */}
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-xs">
                  {item.category}
                </Badge>
              </div>
              
              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                <img 
                  src={item.image_url} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-2">
                <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {item.member_count}
                  </span>
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                    {item.match_score}% match
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Scroll indicator gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
