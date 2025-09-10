import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Calendar, Edit, Eye } from "lucide-react";
import { AutopilotAction, AutopilotCategory, AutopilotPriority } from "@/types/autopilot";
import { cn } from "@/lib/utils";

interface VisualActionCardProps {
  action: AutopilotAction;
  onExecute: (actionId: string) => void;
  onDismiss: (actionId: string) => void;
  onEdit?: (actionId: string) => void;
  onDetails?: (actionId: string) => void;
  className?: string;
}

const getCategoryVisuals = (category: AutopilotCategory) => {
  switch (category) {
    case "community":
      return {
        background: "bg-gradient-to-br from-orange-400/20 via-red-400/15 to-pink-400/10",
        iconBg: "bg-gradient-to-br from-orange-500 to-red-500",
        textColor: "text-orange-800 dark:text-orange-200",
        borderColor: "border-orange-200/50 dark:border-orange-800/50"
      };
    case "health":
      return {
        background: "bg-gradient-to-br from-blue-400/20 via-teal-400/15 to-cyan-400/10",
        iconBg: "bg-gradient-to-br from-blue-500 to-teal-500",
        textColor: "text-blue-800 dark:text-blue-200",
        borderColor: "border-blue-200/50 dark:border-blue-800/50"
      };
    case "media":
      return {
        background: "bg-gradient-to-br from-purple-400/20 via-pink-400/15 to-indigo-400/10",
        iconBg: "bg-gradient-to-br from-purple-500 to-pink-500",
        textColor: "text-purple-800 dark:text-purple-200",
        borderColor: "border-purple-200/50 dark:border-purple-800/50"
      };
    case "discover":
      return {
        background: "bg-gradient-to-br from-amber-400/20 via-yellow-400/15 to-orange-400/10",
        iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
        textColor: "text-amber-800 dark:text-amber-200",
        borderColor: "border-amber-200/50 dark:border-amber-800/50"
      };
    case "calendar":
      return {
        background: "bg-gradient-to-br from-gray-400/20 via-slate-400/15 to-zinc-400/10",
        iconBg: "bg-gradient-to-br from-gray-600 to-slate-600",
        textColor: "text-gray-800 dark:text-gray-200",
        borderColor: "border-gray-200/50 dark:border-gray-800/50"
      };
    default:
      return {
        background: "bg-gradient-to-br from-gray-400/20 via-slate-400/15 to-zinc-400/10",
        iconBg: "bg-gradient-to-br from-gray-500 to-slate-500",
        textColor: "text-gray-800 dark:text-gray-200",
        borderColor: "border-gray-200/50 dark:border-gray-800/50"
      };
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
  const visuals = getCategoryVisuals(action.category);
  const motivationalHook = getMotivationalHook(action);
  
  return (
    <div 
      className={cn(
        "overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg",
        visuals.background,
        visuals.borderColor,
        className
      )}
    >
      <div className="flex h-full">
        {/* Left Half - Visual Identity */}
        <div className="w-1/2 relative flex items-center justify-center p-6">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg",
            visuals.iconBg
          )}>
            <span className="text-3xl">{action.icon}</span>
          </div>
          
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/30" />
            <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-white/20" />
            <div className="absolute top-1/2 right-1/4 w-6 h-6 rounded-full bg-white/15" />
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