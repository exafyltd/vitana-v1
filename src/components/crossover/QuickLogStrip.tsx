import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Droplets, Apple, Dumbbell, Moon, Heart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickLogStripProps {
  className?: string;
}

const quickLogButtons = [
  { 
    icon: Droplets, 
    label: "Log Hydration", 
    sublabel: "8oz water",
    color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
    path: "/health-tracker/hydration"
  },
  { 
    icon: Apple, 
    label: "Log Meal", 
    sublabel: "Food intake",
    color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200",
    iconColor: "text-green-600",
    path: "/health-tracker/nutrition"
  },
  { 
    icon: Dumbbell, 
    label: "Log Exercise", 
    sublabel: "15min activity",
    color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
    path: "/health-tracker/exercise"
  },
  { 
    icon: Moon, 
    label: "Log Sleep", 
    sublabel: "8hrs quality",
    color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    iconColor: "text-indigo-600",
    path: "/health-tracker/sleep"
  },
  { 
    icon: Heart, 
    label: "Log Mood", 
    sublabel: "How you feel",
    color: "bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200",
    iconColor: "text-pink-600",
    path: "/health-tracker/mental-health"
  },
];

export function QuickLogStrip({ className }: QuickLogStripProps) {
  const navigate = useNavigate();

  const handleQuickLog = (path: string) => {
    navigate(path);
  };

  return (
    <Card className={cn(
      "bg-card border-border/50 p-6 w-full",
      className
    )}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Quick Health Logging</h3>
            <p className="text-sm text-muted-foreground">Track your daily activities with one tap</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-8">
            <Plus className="w-3 h-3 mr-1" />
            Custom
          </Button>
        </div>
        
        {/* Horizontal Logging Buttons */}
        <div className="flex items-center justify-between gap-6">
          {quickLogButtons.map((button) => (
            <div key={button.label} className="flex flex-col items-center space-y-3 flex-1">
              {/* Icon Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleQuickLog(button.path)}
                className={cn(
                  "w-20 h-20 rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95",
                  "flex items-center justify-center shadow-sm hover:shadow-lg",
                  button.color
                )}
              >
                <button.icon className={cn("w-8 h-8", button.iconColor)} />
              </Button>
              
              {/* Label Text */}
              <div className="text-center space-y-1">
                <div className="text-sm font-semibold text-foreground leading-tight">
                  {button.label.replace('Log ', '')}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {button.sublabel}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Info */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Your data is automatically synced and contributes to your Vitana Index
          </p>
        </div>
      </div>
    </Card>
  );
}