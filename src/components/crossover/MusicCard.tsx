import { Music, Play, Pause, Heart, SkipForward } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function MusicCard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  return (
    <Card className="h-full bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200/50 group cursor-pointer relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="secondary" className="bg-pink-200/80 text-pink-700 text-xs">Music</Badge>
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
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg flex items-center justify-center flex-shrink-0">
            <Music className="w-6 h-6 text-pink-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate text-pink-800">Peaceful Morning</h3>
            <p className="text-xs text-pink-600 truncate">Nature Sounds Collective</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs text-pink-600">
            <span>2:34</span>
            <span>4:20</span>
          </div>
          <div className="w-full bg-pink-200 rounded-full h-1.5">
            <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-300" style={{ width: "60%" }}></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 group-hover:opacity-50 transition-opacity duration-300">
          <Button size="sm" variant="ghost" onClick={toggleLike} className="hover:bg-pink-100">
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-400 text-pink-400' : 'text-pink-500'}`} />
          </Button>
          <Button size="sm" variant="ghost" className="hover:bg-pink-100 text-pink-500">
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}