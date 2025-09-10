import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Zap, Clock } from "lucide-react";
import { AutopilotAction, AutopilotActionStatus } from "@/types/autopilot";

// Import images
import sunriseRoutineImg from "@/assets/ai-feed/sunrise-routine.jpg";
import hydrationTrackingImg from "@/assets/ai-feed/hydration-tracking.jpg";
import eveningWinddownImg from "@/assets/ai-feed/evening-winddown.jpg";

interface VisualActivityFeedProps {
  activities: Array<{
    id: string;
    type: "action" | "routine" | "suggestion";
    title: string;
    reason: string;
    timestamp: Date;
    status: AutopilotActionStatus;
    icon: string;
    category: string;
  }>;
}

const getCategoryImage = (category: string, title: string) => {
  if (title.toLowerCase().includes("hydration") || title.toLowerCase().includes("water")) {
    return hydrationTrackingImg;
  }
  if (title.toLowerCase().includes("morning") || title.toLowerCase().includes("routine")) {
    return sunriseRoutineImg;
  }
  if (title.toLowerCase().includes("evening") || title.toLowerCase().includes("wind")) {
    return eveningWinddownImg;
  }
  // Default based on category
  switch (category) {
    case "health": return hydrationTrackingImg;
    default: return sunriseRoutineImg;
  }
};

const getMotivationalHook = (title: string, status: AutopilotActionStatus) => {
  if (title.toLowerCase().includes("hydration")) {
    return status === "completed" ? "Hydration mastery achieved 💧✨" : "Your body is calling for water 💧";
  }
  if (title.toLowerCase().includes("morning")) {
    return status === "completed" ? "Morning flow complete - energy peak unlocked ⚡" : "Your 8 AM energy peak is waiting ☀️";
  }
  if (title.toLowerCase().includes("evening")) {
    return status === "completed" ? "Wind-down ritual mastered 🌙" : "Time to prepare for restful sleep 😴";
  }
  return status === "completed" ? "Action completed successfully ✨" : "AI suggestion ready for you ⚡";
};

const getStatusIcon = (status: AutopilotActionStatus) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-3 h-3 mr-1" />;
    case "failed": return <AlertTriangle className="w-3 h-3 mr-1" />;
    case "executing": return <Zap className="w-3 h-3 mr-1" />;
    default: return null;
  }
};

const getStatusVariant = (status: AutopilotActionStatus) => {
  switch (status) {
    case "completed": return "default" as const;
    case "failed": return "destructive" as const;
    case "executing": return "secondary" as const;
    default: return "outline" as const;
  }
};

export function VisualActivityFeed({ activities }: VisualActivityFeedProps) {
  const getCardLayout = (index: number) => {
    const pattern = index % 6;
    switch (pattern) {
      case 0: return "col-span-2"; // Large card
      case 1: 
      case 2: return "col-span-1"; // Medium cards
      case 3:
      case 4:
      case 5: return "col-span-1"; // Small cards (3 in a row)
      default: return "col-span-2";
    }
  };

  const getCardHeight = (index: number) => {
    const pattern = index % 6;
    if (pattern === 0) return "h-40"; // Large card
    if (pattern <= 2) return "h-32"; // Medium cards
    return "h-28"; // Small cards
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {activities.slice(0, 12).map((activity, index) => (
        <Card 
          key={activity.id} 
          className={`
            ${getCardLayout(index)} bg-white/80 backdrop-blur-sm border-white/20 
            hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group
            hover:border-primary/20
          `}
        >
          <CardContent className="p-0">
            <div className={`flex ${getCardHeight(index)}`}>
              {/* Left: Image with overlay */}
              <div className="relative w-32 md:w-40 flex-shrink-0">
                <img 
                  src={getCategoryImage(activity.category, activity.title)}
                  alt={activity.title}
                  className="w-full h-full object-cover rounded-l-lg group-hover:scale-105 transition-transform duration-300"
                />
                {/* Gradient overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent rounded-l-lg" />
                
                {/* Category badge on image - standardized positioning */}
                <div className="absolute top-3 left-3">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded-full text-white text-xs font-medium shadow-lg">
                    {activity.icon} {activity.category}
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 p-3 md:p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-xs md:text-sm font-semibold text-foreground leading-tight">{activity.title}</h4>
                    <div className="flex items-center space-x-2 ml-2">
                      <Badge 
                        variant={getStatusVariant(activity.status)}
                        className="text-xs h-5"
                      >
                        {getStatusIcon(activity.status)}
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-1 leading-relaxed">{activity.reason}</p>
                  <p className="text-xs font-medium text-primary leading-tight">
                    {getMotivationalHook(activity.title, activity.status)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === "completed" ? "bg-green-400 shadow-lg shadow-green-400/50" :
                      activity.status === "failed" ? "bg-red-400 shadow-lg shadow-red-400/50" :
                      activity.status === "executing" ? "bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50" :
                      "bg-gray-400"
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}