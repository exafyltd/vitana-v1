import { Video, Play, Eye } from "lucide-react";
import { CrossoverCard } from "./CrossoverCard";

export function VideoFeedCard() {
  const content = (
    <div className="space-y-3">
      <div className="relative bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-lg aspect-video flex items-center justify-center group cursor-pointer">
        <div className="absolute inset-0 bg-black/10 rounded-lg"></div>
        <Play className="w-8 h-8 text-cyan-700 group-hover:scale-110 transition-transform" />
        <div className="absolute bottom-2 right-2 bg-black/20 rounded px-1.5 py-0.5">
          <span className="text-xs text-white font-medium">5:42</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold text-sm leading-tight">
          Morning Yoga Flow for Energy
        </h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Wellness Studio</span>
          <div className="flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>2.1k</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Video}
      category="video"
      title="Wellness Videos"
      subtitle="Featured Content"
      content={content}
      buttonText="Watch More"
      onButtonClick={() => console.log("Open video feed")}
    />
  );
}