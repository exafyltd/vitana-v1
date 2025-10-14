import { Volume2, Play, Pause, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

export function PodcastCard() {
  const { currentPodcast, isPlaying, playPodcast, togglePlay } = useAudioPlayer();
  
  // Sample podcast data - in real app this would come from props
  const podcastData = {
    id: 'wellness-hour-42',
    title: 'The Wellness Hour',
    host: 'Health Network',
    audioUrl: '/sample-audio.mp3', // Replace with actual audio URL
    duration: 2720, // 45:20 in seconds
    imageUrl: undefined,
  };

  const handlePlayToggle = () => {
    if (currentPodcast?.id === podcastData.id) {
      togglePlay();
    } else {
      playPodcast(podcastData);
    }
  };

  const isThisPodcastPlaying = isPlaying && currentPodcast?.id === podcastData.id;

  return (
    <Card className="h-full bg-violet-50 border-violet-200 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-violet-200 text-violet-700 text-xs">Podcast</Badge>
      </div>
      <CardContent className="p-4 relative">
        {/* Corner play button - doesn't cover content */}
        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="sm" 
            className="rounded-full w-8 h-8 bg-white/90 hover:bg-white shadow-lg"
            style={{ color: 'hsl(var(--pill-mental-accent))' }}
            onClick={handlePlayToggle}
          >
            {isThisPodcastPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: 'hsl(var(--pill-mental-accent) / 0.1)' }}>
            <Volume2 className="w-5 h-5" style={{ color: 'hsl(var(--pill-mental-accent))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <h3 className="font-semibold text-sm text-foreground leading-tight">The Wellness Hour</h3>
              <Badge variant="secondary" className="text-xs bg-violet-200 text-violet-700 mt-1 inline-block">New</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Episode 42: Mindful Morning Routines</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>45:20</span>
              <span>•</span>
              <span>2.1k plays</span>
              <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">Health</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-4">
          <Button size="sm" variant="ghost" className="hover:bg-muted" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}