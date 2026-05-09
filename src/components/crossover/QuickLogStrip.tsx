import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Droplets, Apple, Dumbbell, Moon, Heart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

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
    path: "/health/my-health-tracker"
  },
  { 
    icon: Apple, 
    label: "Log Meal", 
    sublabel: "Food intake",
    color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200",
    iconColor: "text-green-600",
    path: "/health/my-health-tracker"
  },
  { 
    icon: Dumbbell, 
    label: "Log Exercise", 
    sublabel: "15min activity",
    color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
    path: "/health/my-health-tracker"
  },
  { 
    icon: Moon, 
    label: "Log Sleep", 
    sublabel: "8hrs quality",
    color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    iconColor: "text-indigo-600",
    path: "/health/my-health-tracker"
  },
  { 
    icon: Heart, 
    label: "Log Mood", 
    sublabel: "How you feel",
    color: "bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200",
    iconColor: "text-pink-600",
    path: "/health/my-health-tracker"
  },
];

function QuickLogStripBase({ className }: QuickLogStripProps) {
  const navigate = useNavigate();

  const handleQuickLog = (path: string) => {
    navigate(path);
  };

  return (
    <Card className={cn(
      "bg-card border-border/50 p-4",
      className
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t('screens.crossover.quickLogging')}</h3>
            <p className="text-xs text-muted-foreground">{t('screens.crossover.trackDailyActivities')}</p>
          </div>
        </div>
        
        {/* Compact Logging Buttons */}
        <div className="grid grid-cols-5 gap-3">
          {quickLogButtons.map((button) => (
            <div key={button.label} className="flex flex-col items-center space-y-2">
              {/* Icon Button - Consistent with other dashboard cards */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLog(button.path)}
                className={cn(
                  "w-12 h-12 rounded-xl border transition-all duration-200 hover:scale-105",
                  "flex items-center justify-center shadow-sm hover:shadow-md",
                  button.color
                )}
              >
                <button.icon className={cn("w-5 h-5", button.iconColor)} />
              </Button>
              
              {/* Compact Label */}
              <div className="text-center">
                <div className="text-xs font-medium text-foreground leading-tight">
                  {button.label.replace('Log ', '')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export const QuickLogStrip = withCardId(QuickLogStripBase, "CT-UT-001", "C-005");