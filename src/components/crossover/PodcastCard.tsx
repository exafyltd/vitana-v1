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
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">The Wellness Hour</h3>
              <Badge variant="secondary" className="text-xs">New</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 truncate">Episode 42: Mindful Morning Routines</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>45:20</span>
              <span>•</span>
              <span>2.1k plays</span>
              <Badge variant="outline" className="text-xs">Health</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" variant="ghost">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}