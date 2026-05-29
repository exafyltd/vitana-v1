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
import { t } from '@/lib/i18n-toast';

import { fmtTime } from '@/lib/locale-format';
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
        "group overflow-hidden rounded-2xl border-l-4 transition-all duration-300 bg-card/70 backdrop-blur-lg dark:bg-card/60",
        "border-border/50 border shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]",
        "hover:border-l-8 hover:border-primary/30",
        getCategoryColor(action.category),
        className
      )}
    >
      <div className="flex flex-col sm:flex-row h-auto sm:h-[170px]">
        {/* Left Half - Real Image */}
        <div className="w-full sm:w-1/2 h-32 sm:h-full relative overflow-hidden">
          <div className="w-full h-full">
            <img
              src={actionImage}
              alt={action.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
            
            {/* Category badge - reduced size */}
            <div className="absolute top-2 left-2">
              <div className="w-8 h-8 rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
                <span className="text-base">{action.icon}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Half - Action Content with tighter spacing */}
        <div className="w-full sm:w-1/2 p-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* Motivational Hook - smaller text */}
            <div className="text-xs font-medium text-muted-foreground leading-snug">
              {motivationalHook}
            </div>
            
            {/* Title & Tags with tighter hierarchy */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">
                {action.title}
              </h4>
              
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-2 py-0.5 font-medium", getPriorityColor(action.priority))}
                >
                  {action.priority}
                </Badge>
                {action.timeEstimate && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50 font-medium">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {action.timeEstimate}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Reason with smaller text */}
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-snug">
              {action.reason}
            </p>
          </div>

          {/* Action Buttons - horizontal layout with Vitana gradient + outline */}
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm"
              onClick={() => onExecute(action.id)}
              className="flex-1 text-xs h-8 bg-gradient-to-r from-[hsl(var(--gradient-vitana-start))] to-[hsl(var(--gradient-vitana-end))] hover:from-[hsl(var(--gradient-vitana-start))]/90 hover:to-[hsl(var(--gradient-vitana-end))]/90 text-white border-0 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[hsl(var(--gradient-vitana-end))]/30 active:scale-95 shadow-md"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('screens.actions.doNow')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDismiss(action.id)}
              className="flex-1 text-xs h-8 bg-transparent backdrop-blur-sm border-border/60 hover:bg-muted/50 hover:border-border transition-all duration-300 font-medium"
            >{t('screens.actions.later')}
            </Button>
          </div>
          
          {/* Secondary Actions - more subtle */}
          <div className="flex justify-between mt-2 pt-2 border-t border-border/20">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit?.(action.id)}
              className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit className="w-2.5 h-2.5 mr-1" />
              {t('screens.actions.edit')}
            </Button>
            <div className="text-[10px] text-muted-foreground/60 font-mono flex items-center">
              {fmtTime(new Date(action.timestamp), { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
              })}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDetails?.(action.id)}
              className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="w-2.5 h-2.5 mr-1" />
              {t('screens.actions.details')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}