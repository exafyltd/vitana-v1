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
      "bg-card border-border/50 p-8",
      className
    )}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Quick Health Logging</h3>
            <p className="text-sm text-muted-foreground">Capture your daily health activities in seconds</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Custom Log
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {quickLogButtons.map((button) => (
            <div key={button.label} className="flex flex-col items-center gap-3">
              <Button
                variant="outline"
                onClick={() => handleQuickLog(button.path)}
                className={cn(
                  "h-16 w-16 p-3 flex items-center justify-center transition-all duration-200 border rounded-lg",
                  button.color
                )}
              >
                <button.icon className={cn("w-6 h-6", button.iconColor)} />
              </Button>
              <div className="text-center space-y-1">
                <div className="text-sm font-semibold leading-tight">{button.label}</div>
                <div className="text-xs opacity-70 leading-tight">{button.sublabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}