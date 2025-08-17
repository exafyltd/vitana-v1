import { Podcast, Play, Pause } from "lucide-react";
import { CrossoverCard } from "./CrossoverCard";
import { useState } from "react";

export function PodcastCard() {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // Here you would integrate with actual audio player
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">The Wellness Hour</h4>
          <p className="text-xs text-muted-foreground">Episode 42: Mindful Morning Routines</p>
        </div>
        <button 
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-yellow-200/50 flex items-center justify-center hover:bg-yellow-200/80 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-yellow-700" />
          ) : (
            <Play className="w-4 h-4 text-yellow-700 ml-0.5" />
          )}
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>12:34</span>
          <span>45:20</span>
        </div>
        <div className="w-full bg-yellow-100 rounded-full h-1.5">
          <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: "28%" }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Podcast}
      category="podcast"
      title="Now Playing"
      subtitle="Wellness Podcast"
      content={content}
      buttonText="Browse All"
      onButtonClick={() => console.log("Browse podcasts")}
    />
  );
}