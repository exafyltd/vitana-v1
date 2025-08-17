import { Music, Play, Pause, Heart } from "lucide-react";
import { CrossoverCard } from "./CrossoverCard";
import { useState } from "react";

export function MusicCard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // Here you would integrate with actual music player
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-200 to-rose-300 rounded-lg flex items-center justify-center">
          <Music className="w-5 h-5 text-rose-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">Peaceful Moments</h4>
          <p className="text-xs text-muted-foreground truncate">Ambient Wellness</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-rose-200/50 flex items-center justify-center hover:bg-rose-200/80 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-rose-700" />
          ) : (
            <Play className="w-4 h-4 text-rose-700 ml-0.5" />
          )}
        </button>
        
        <button 
          onClick={toggleLike}
          className="w-6 h-6 flex items-center justify-center"
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${
              isLiked ? 'text-rose-500 fill-rose-500' : 'text-rose-300'
            }`} 
          />
        </button>
      </div>
      
      <div className="w-full bg-rose-100 rounded-full h-1.5">
        <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: "65%" }}></div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Music}
      category="music"
      title="Your Music"
      subtitle="Relaxing Vibes"
      content={content}
      buttonText="Open Player"
      onButtonClick={() => console.log("Open music player")}
    />
  );
}