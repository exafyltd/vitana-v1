import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Calendar, Edit, Eye } from "lucide-react";
import { AutopilotAction, AutopilotCategory, AutopilotPriority } from "@/types/autopilot";
import { cn } from "@/lib/utils";

// Import action images
import communityDanceImage from "@/assets/actions/community-dance-group.jpg";
import doctorBiomarkerImage from "@/assets/actions/doctor-biomarker-review.jpg";
import aiNeuralImage from "@/assets/actions/ai-neural-patterns.jpg";
import friendsMeetupImage from "@/assets/actions/friends-meetup-selfie.jpg";
import hydrationBottleImage from "@/assets/actions/hydration-water-bottle.jpg";
import wellnessYogaImage from "@/assets/actions/wellness-yoga-nature.jpg";

interface VisualActionCardProps {
  action: AutopilotAction;
  onExecute: (actionId: string) => void;
  onDismiss: (actionId: string) => void;
  onEdit?: (actionId: string) => void;
  onDetails?: (actionId: string) => void;
  className?: string;
}

const getImageForAction = (action: AutopilotAction) => {
  // Use specific image if provided
  if (action.imageUrl) {
    const imageMap: { [key: string]: string } = {
      "/src/assets/actions/community-dance-group.jpg": communityDanceImage,
      "/src/assets/actions/doctor-biomarker-review.jpg": doctorBiomarkerImage,
      "/src/assets/actions/ai-neural-patterns.jpg": aiNeuralImage,
      "/src/assets/actions/friends-meetup-selfie.jpg": friendsMeetupImage,
      "/src/assets/actions/hydration-water-bottle.jpg": hydrationBottleImage,
      "/src/assets/actions/wellness-yoga-nature.jpg": wellnessYogaImage,
    };
    return imageMap[action.imageUrl] || communityDanceImage;
  }
  
  // Fallback to category-based image
  switch (action.category) {
    case "community":
      return communityDanceImage;
    case "health":
      return action.title.toLowerCase().includes("biomarker") || action.title.toLowerCase().includes("doctor") 
        ? doctorBiomarkerImage 
        : hydrationBottleImage;
    case "media":
      return wellnessYogaImage;
    case "discover":
      return aiNeuralImage;
    case "calendar":
      return wellnessYogaImage;
    default:
      return communityDanceImage;
  }
};

const getPriorityColor = (priority: AutopilotPriority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
  }
};

const getCategoryColor = (category: AutopilotCategory) => {
  switch (category) {
    case "community":
      return "border-l-[hsl(var(--domain-community-accent))]";
    case "health":
      return "border-l-[hsl(var(--pill-hydration-accent))]";
    case "discover":
      return "border-l-[hsl(var(--domain-discover-accent))]";
    case "media":
      return "border-l-[hsl(var(--pill-nutrition-accent))]";
    case "calendar":
      return "border-l-[hsl(var(--util-calendar-accent))]";
    default:
      return "border-l-[hsl(var(--domain-community-accent))]";
  }
};

const getMotivationalHook = (action: AutopilotAction) => {
  const { category, title } = action;
  
  if (title.toLowerCase().includes("dance")) {
    return "Dance tonight = smiles guaranteed 💃✨";
  }
  if (title.toLowerCase().includes("hydration") || title.toLowerCase().includes("water")) {
    return "Your streak is legendary — one more day! 🔥";
  }
  if (title.toLowerCase().includes("energy") || title.toLowerCase().includes("peak")) {
    return "Perfect timing for your 8 AM energy peak ⚡";
  }
  if (title.toLowerCase().includes("biomarker") || title.toLowerCase().includes("results")) {
    return "Your numbers are ready to reveal insights 📊";
  }
  if (title.toLowerCase().includes("invite") || title.toLowerCase().includes("friends")) {
    return "Your friends are waiting for you 👫 — let's make it happen";
  }
  if (title.toLowerCase().includes("podcast") || title.toLowerCase().includes("episode")) {
    return "Your next breakthrough is one listen away 🎧";
  }
  if (title.toLowerCase().includes("wellness") || title.toLowerCase().includes("yoga")) {
    return "Your mind and body are calling for this 🧘‍♀️";
  }
  if (title.toLowerCase().includes("ai") || title.toLowerCase().includes("suggestion")) {
    return "Your digital twin has something exciting ✨";
  }
  
  // Enhanced default hooks by category
  switch (category) {
    case "community":
      return "Your tribe is out there — time to connect 🌟";
    case "health":
      return "Your future self will thank you 💪";
    case "media":
      return "Knowledge that speaks to your soul 🎯";
    case "discover":
      return "Something amazing just dropped for you 🚀";
    case "calendar":
      return "Your productive hours are calling ⏰";
    default:
      return "AI magic tailored just for you 🤖";
  }
};

export function VisualActionCard({ 
  action, 
  onExecute, 
  onDismiss, 
  onEdit, 
  onDetails, 
  className 
}: VisualActionCardProps) {
  const actionImage = getImageForAction(action);
  const motivationalHook = getMotivationalHook(action);
  
  return (
    <div 
      className={cn(
        "group overflow-hidden rounded-xl border-l-4 border-t border-r border-b transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-card",
        "border-border hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]",
        getCategoryColor(action.category),
        className
      )}
    >
      <div className="flex h-full min-h-[220px]">
        {/* Left Half - Real Image with 16:9 aspect ratio */}
        <div className="w-1/2 relative overflow-hidden">
          <div className="aspect-video w-full h-full">
            <img
              src={actionImage}
              alt={action.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Gradient overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
            
            {/* Category badge - top-left corner */}
            <div className="absolute top-3 left-3">
              <div className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                <span className="text-lg">{action.icon}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Half - Action Content with enhanced typography */}
        <div className="w-1/2 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Motivational Hook - enhanced */}
            <div className="text-sm font-medium text-muted-foreground leading-relaxed">
              {motivationalHook}
            </div>
            
            {/* Title & Tags with better hierarchy */}
            <div className="space-y-3">
              <h4 className="font-bold text-base leading-tight line-clamp-2 text-foreground">
                {action.title}
              </h4>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-2.5 py-1", getPriorityColor(action.priority))}
                >
                  {action.priority}
                </Badge>
                {action.timeEstimate && (
                  <Badge variant="outline" className="text-xs px-2.5 py-1 bg-muted/50">
                    <Clock className="w-3 h-3 mr-1" />
                    {action.timeEstimate}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Reason with softer contrast */}
            <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {action.reason}
            </p>
          </div>

          {/* Action Buttons with premium styling */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Button 
              size="sm"
              onClick={() => onExecute(action.id)}
              className="text-sm h-9 bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:from-[hsl(var(--gradient-join-start))]/90 hover:to-[hsl(var(--gradient-join-end))]/90 text-white border-0 font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Do Now
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDismiss(action.id)}
              className="text-sm h-9 bg-background/60 backdrop-blur-sm border-border/60 hover:bg-background/80 transition-all duration-200"
            >
              Later
            </Button>
          </div>
          
          {/* Secondary Actions with better spacing */}
          <div className="flex justify-between mt-3 pt-2 border-t border-border/30">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit?.(action.id)}
              className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDetails?.(action.id)}
              className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>

          {/* Timestamp with consistent alignment */}
          <div className="text-xs text-muted-foreground/60 mt-2 text-right font-mono">
            {new Date(action.timestamp).toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            })}
          </div>
        </div>
      </div>
    </div>
  );
}