import { Music, Play, Pause, Heart, SkipForward } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { t } from '@/lib/i18n-toast';

export function MusicCard() {
  const { currentMedia, isPlaying, playMedia, pause } = useAudioPlayer();
  const [isLiked, setIsLiked] = useState(false);

  const togglePlay = () => {
    if (currentMedia?.id === 'peaceful-morning' && isPlaying) {
      pause();
    } else {
      playMedia({
        id: 'peaceful-morning',
        title: 'Peaceful Morning',
        creator: 'Nature Sounds Collective',
        audioUrl: '/sample-audio.mp3', // Replace with actual URL
        duration: 260,
        mediaType: 'music'
      });
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const isCurrentlyPlaying = currentMedia?.id === 'peaceful-morning' && isPlaying;

  return (
    <Card className="h-full relative overflow-hidden border-2 border-purple-400/50 hover:border-purple-400 transition-all group">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 -z-10" />
      
      {/* Music note watermark */}
      <Music className="absolute top-2 right-2 w-8 h-8 text-purple-400/20" />
      
      <div className="absolute top-2 left-2 z-10">
        <Badge className="bg-purple-500 text-white text-xs">Music</Badge>
      </div>
      
      <CardContent className="p-4 relative">
        {/* Corner play button - doesn't cover content */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="sm" 
            className="rounded-full w-8 h-8 bg-white/90 hover:bg-white shadow-lg text-purple-600"
            onClick={togglePlay}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200 relative">
            <Music className="w-5 h-5 text-purple-500" />
            {isCurrentlyPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <div className="flex gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-white animate-pulse rounded-full"
                      style={{
                        height: `${8 + Math.random() * 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.6 + Math.random() * 0.4}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground leading-tight">{t('screens.crossover.peacefulMorning')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('screens.crossover.natureSoundsCollective')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>2:34</span>
            <span>4:20</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" style={{ width: "60%" }}></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Button size="sm" variant="ghost" onClick={toggleLike} className="hover:bg-purple-50">
            <Heart className={`w-4 h-4 text-purple-500 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" className="hover:bg-purple-50 text-purple-500">
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}