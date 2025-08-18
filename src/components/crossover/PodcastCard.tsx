import { Volume2, Play, Pause, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function PodcastCard() {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="h-full bg-violet-50 border-violet-200 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-violet-200 text-violet-700 text-xs">Podcast</Badge>
      </div>
      <CardContent className="p-4 relative">
        {/* Hover overlay with large play button */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--pill-mental-accent) / 0.2)' }}>
          <Button 
            size="lg" 
            className="rounded-full w-16 h-16 bg-white/90 hover:bg-white shadow-lg"
            style={{ color: 'hsl(var(--pill-mental-accent))' }}
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8" />
            )}
          </Button>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ backgroundColor: 'hsl(var(--pill-mental-accent) / 0.1)' }}>
            <Volume2 className="w-5 h-5" style={{ color: 'hsl(var(--pill-mental-accent))' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate text-foreground">The Wellness Hour</h3>
              <Badge variant="secondary" className="text-xs bg-violet-200 text-violet-700">New</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 truncate">Episode 42: Mindful Morning Routines</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>45:20</span>
              <span>•</span>
              <span>2.1k plays</span>
              <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">Health</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center group-hover:opacity-50 transition-opacity duration-300">
          <Button size="sm" variant="ghost" className="hover:bg-muted" style={{ color: 'hsl(var(--pill-mental-accent))' }}>
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}