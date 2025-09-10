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

const getMotivationalHook = (action: AutopilotAction) => {
  const { category, title } = action;
  
  if (title.toLowerCase().includes("dance")) {
    return "Perfect match for your movement goals 🕺";
  }
  if (title.toLowerCase().includes("hydration") || title.toLowerCase().includes("water")) {
    return "Your hydration streak is on fire 🔥";
  }
  if (title.toLowerCase().includes("energy") || title.toLowerCase().includes("peak")) {
    return "AI detected your 8 AM energy peak ⚡";
  }
  if (title.toLowerCase().includes("biomarker") || title.toLowerCase().includes("results")) {
    return "Your health data tells a story 📊";
  }
  if (title.toLowerCase().includes("invite") || title.toLowerCase().includes("friends")) {
    return "Your social wellness circle is expanding 👥";
  }
  if (title.toLowerCase().includes("podcast") || title.toLowerCase().includes("episode")) {
    return "Knowledge that matches your wellness journey 🎧";
  }
  
  // Default hooks by category
  switch (category) {
    case "community":
      return "Your social wellness awaits ✨";
    case "health":
      return "Your wellness journey continues 💪";
    case "media":
      return "Perfect content for your growth 🎯";
    case "discover":
      return "Curated just for your lifestyle 🌟";
    case "calendar":
      return "Optimize your productive hours ⏰";
    default:
      return "AI-powered recommendation for you 🤖";
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
        "overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg bg-white dark:bg-card",
        "border-gray-200/50 dark:border-gray-800/50",
        className
      )}
    >
      <div className="flex h-full min-h-[200px]">
        {/* Left Half - Real Image */}
        <div className="w-1/2 relative overflow-hidden">
          <img
            src={actionImage}
            alt={action.title}
            className="w-full h-full object-cover"
          />
          
          {/* Image overlay with icon */}
          <div className="absolute inset-0 bg-black/20">
            <div className="absolute bottom-4 left-4">
              <div className="w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-2xl">{action.icon}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Half - Action Content */}
        <div className="w-1/2 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Motivational Hook */}
            <div className="text-xs font-medium text-muted-foreground">
              {motivationalHook}
            </div>
            
            {/* Title & Tags */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                {action.title}
              </h4>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs px-2 py-0.5", getPriorityColor(action.priority))}
                >
                  {action.priority}
                </Badge>
                {action.timeEstimate && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {action.timeEstimate}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Reason */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {action.reason}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button 
              size="sm"
              onClick={() => onExecute(action.id)}
              className="text-xs h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Do Now
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDismiss(action.id)}
              className="text-xs h-8"
            >
              Later
            </Button>
          </div>
          
          {/* Secondary Actions */}
          <div className="flex justify-between mt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit?.(action.id)}
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDetails?.(action.id)}
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground mt-2 text-right">
            {new Date(action.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}