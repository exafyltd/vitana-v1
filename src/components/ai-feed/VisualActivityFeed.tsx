import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RewardDot } from "@/components/ui/reward-dot";
import { CheckCircle, AlertTriangle, Zap, Clock, Award, TrendingUp, Droplet } from "lucide-react";
import { AutopilotAction, AutopilotActionStatus } from "@/types/autopilot";

// Import images
import sunriseRoutineImg from "@/assets/ai-feed/sunrise-routine.jpg";
import hydrationTrackingImg from "@/assets/ai-feed/hydration-tracking.jpg";
import eveningWinddownImg from "@/assets/ai-feed/evening-winddown.jpg";

import { fmtDate, fmtTime } from '@/lib/locale-format';
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

const getCategoryGradient = (category: string, title: string) => {
  // Determine category from title or category prop
  if (title.toLowerCase().includes("hydration") || title.toLowerCase().includes("water") || category === "hydration") {
    return "bg-gradient-to-r from-pill-hydration-tint to-background"; // Aqua gradient
  }
  if (title.toLowerCase().includes("sleep") || title.toLowerCase().includes("rest") || category === "sleep") {
    return "bg-gradient-to-r from-blue-50 to-background dark:from-blue-950/20"; // Blue gradient for sleep
  }
  if (title.toLowerCase().includes("exercise") || title.toLowerCase().includes("workout") || category === "exercise") {
    return "bg-gradient-to-r from-orange-50 to-background dark:from-orange-950/20"; // Orange gradient for exercise
  }
  if (category === "health" || category === "mental") {
    return "bg-gradient-to-r from-pill-mental-tint to-background";
  }
  return "bg-gradient-to-r from-card to-background"; // Default
};

const getSecondaryInfo = (category: string, title: string, status: AutopilotActionStatus) => {
  const mockData = {
    streak: Math.floor(Math.random() * 14) + 1,
    credits: Math.floor(Math.random() * 50) + 10,
    source: ["Vitana AI", "Health Coach", "Personal Tracker", "Community"][Math.floor(Math.random() * 4)]
  };

  if (title.toLowerCase().includes("hydration")) {
    return {
      streak: `${mockData.streak} day streak`,
      credits: `+${mockData.credits} pts earned`,
      source: `via ${mockData.source}`
    };
  }
  if (title.toLowerCase().includes("exercise") || title.toLowerCase().includes("workout")) {
    return {
      streak: `${mockData.streak} session streak`,
      credits: `+${mockData.credits} pts earned`,
      source: `via ${mockData.source}`
    };
  }
  return {
    streak: `${mockData.streak} day consistency`,
    credits: `+${mockData.credits} pts earned`,
    source: `via ${mockData.source}`
  };
};

const motivationalMessages = [
  { text: "Every small step counts! 🌟", subtext: "Progress compounds over time" },
  { text: "Consistency is your superpower 💪", subtext: "Building habits that last" },
  { text: "You're doing amazing! ✨", subtext: "Celebrate your journey" },
  { text: "Growth happens outside comfort zones 🚀", subtext: "Embrace the challenge" },
  { text: "Your future self will thank you 🙏", subtext: "Investing in your wellbeing" }
];

export function VisualActivityFeed({ activities }: VisualActivityFeedProps) {
  const renderMotivationalDivider = (index: number) => {
    const message = motivationalMessages[index % motivationalMessages.length];
    return (
      <div key={`divider-${index}`} className="my-8">
        <Card className="bg-gradient-to-r from-sys-ai-tint via-background to-sys-ai-tint border-sys-ai-accent/20 overflow-hidden">
          <CardContent className="p-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sys-ai-accent/5 to-transparent" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-foreground mb-2">{message.text}</h3>
              <p className="text-sm text-muted-foreground">{message.subtext}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {activities.slice(0, 8).map((activity, index) => {
        const secondaryInfo = getSecondaryInfo(activity.category, activity.title, activity.status);
        const shouldShowDivider = (index + 1) % 3 === 0 && index < activities.length - 1;
        
        return (
          <div key={activity.id}>
            <Card className={`${getCategoryGradient(activity.category, activity.title)} border-white/20 hover:shadow-lg hover:scale-[1.005] transition-all duration-200 group relative`}>
              <RewardDot 
                points={activity.status === "completed" ? 5 : 3} 
                description={activity.status === "completed" ? "Activity completed! Credits earned" : "Complete activity for credits"}
                position="top-right"
                size="md"
              />
              <CardContent className="p-0">
                <div className="flex min-h-[120px]">
                  {/* Left: Expanded Image (40% width) */}
                  <div className="relative w-2/5 flex-shrink-0 overflow-hidden">
                    <img 
                      src={getCategoryImage(activity.category, activity.title)}
                      alt={activity.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Enhanced gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent group-hover:from-black/30 transition-colors duration-300" />
                    
                    {/* Category badge on image */}
                    <div className="absolute top-3 left-3">
                      <div className="bg-white/25 backdrop-blur-sm border border-white/40 px-2.5 py-1 rounded-full text-white text-xs font-medium shadow-lg">
                        {activity.icon} {activity.category}
                      </div>
                    </div>
                  </div>

                  {/* Center: Content Area (flexed) */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {activity.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activity.reason}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {getMotivationalHook(activity.title, activity.status)}
                      </p>
                      
                      {/* Secondary Info Row */}
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center">
                          <Award className="w-3 h-3 mr-1" />
                          {secondaryInfo.streak}
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {secondaryInfo.credits}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground/80">
                        {secondaryInfo.source}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Strip (fixed width) */}
                  <div className="w-20 bg-background/50 backdrop-blur-sm border-l border-border/50 flex flex-col items-center justify-between p-3">
                    <Badge 
                      variant={getStatusVariant(activity.status)}
                      className="text-xs px-2 py-1 rotate-0"
                    >
                      {getStatusIcon(activity.status)}
                      <span className="sr-only">{activity.status}</span>
                    </Badge>
                    
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {fmtDate(new Date(activity.timestamp), { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtTime(new Date(activity.timestamp), { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false
                        })}
                      </div>
                    </div>
                    
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === "completed" ? "bg-green-400" :
                      activity.status === "failed" ? "bg-red-400" :
                      activity.status === "executing" ? "bg-yellow-400 animate-pulse" :
                      "bg-gray-400"
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {shouldShowDivider && renderMotivationalDivider(Math.floor(index / 3))}
          </div>
        );
      })}
    </div>
  );
}