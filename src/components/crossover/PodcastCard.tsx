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
    <Card className="h-full bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200/50 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-pink-200/80 text-pink-700 text-xs">Podcast</Badge>
      </div>
      <CardContent className="p-4 relative">
        {/* Hover overlay with large play button */}
        <div className="absolute inset-0 bg-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button 
            size="lg" 
            className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-pink-600 shadow-lg"
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
          <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-6 h-6 text-pink-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate text-pink-800">The Wellness Hour</h3>
              <Badge variant="secondary" className="text-xs bg-pink-200 text-pink-700">New</Badge>
            </div>
            <p className="text-xs text-pink-600 mb-2 truncate">Episode 42: Mindful Morning Routines</p>
            <div className="flex items-center gap-3 text-xs text-pink-600 mb-3">
              <span>45:20</span>
              <span>•</span>
              <span>2.1k plays</span>
              <Badge variant="outline" className="text-xs border-pink-300 text-pink-700">Health</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 group-hover:opacity-50 transition-opacity duration-300">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 border-pink-300 text-pink-700 hover:bg-pink-200"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" variant="ghost" className="hover:bg-pink-200 text-pink-600">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}