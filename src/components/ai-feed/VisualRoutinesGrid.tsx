import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, TrendingUp } from "lucide-react";

// Import images
import morningYogaFlowImg from "@/assets/ai-feed/morning-yoga-flow.jpg";
import hydrationTrackingImg from "@/assets/ai-feed/hydration-tracking.jpg";
import eveningWinddownImg from "@/assets/ai-feed/evening-winddown.jpg";

interface Routine {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  streak: number;
  maxStreak: number;
  successRate: number;
  frequency: string;
  active: boolean;
  lastCompleted?: string;
}

interface VisualRoutinesGridProps {
  routines?: Routine[];
  onToggleRoutine?: (routineId: string) => void;
}

const defaultRoutines: Routine[] = [
  {
    id: "morning-flow",
    name: "Daily Morning Flow",
    description: "Energize your day with movement",
    icon: "☀️",
    image: morningYogaFlowImg,
    streak: 7,
    maxStreak: 12,
    successRate: 85,
    frequency: "Daily",
    active: true,
    lastCompleted: "Today"
  },
  {
    id: "hydration-check",
    name: "Hydration Check",
    description: "Stay refreshed every 2 hours",
    icon: "💧",
    image: hydrationTrackingImg,
    streak: 5,
    maxStreak: 8,
    successRate: 80,
    frequency: "Every 2h",
    active: true,
    lastCompleted: "45min ago"
  },
  {
    id: "evening-winddown",
    name: "Evening Wind-down",
    description: "Prepare mind and body for rest",
    icon: "🛌",
    image: eveningWinddownImg,
    streak: 3,
    maxStreak: 7,
    successRate: 71,
    frequency: "Daily",
    active: false,
    lastCompleted: "Yesterday"
  }
];

export function VisualRoutinesGrid({ 
  routines = defaultRoutines, 
  onToggleRoutine 
}: VisualRoutinesGridProps) {
  const primaryRoutine = routines[0];
  const secondaryRoutines = routines.slice(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Large Card - Primary Routine */}
      <Card className="md:col-span-2 bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300 group overflow-hidden">
        <div className="relative h-64">
          <img 
            src={primaryRoutine.image}
            alt={primaryRoutine.name}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Content overlay */}
          <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
            <div className="flex items-start justify-between">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium">{primaryRoutine.icon} {primaryRoutine.frequency}</span>
              </div>
              <Switch 
                checked={primaryRoutine.active}
                onCheckedChange={() => onToggleRoutine?.(primaryRoutine.id)}
                className="data-[state=checked]:bg-white/20"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{primaryRoutine.name}</h3>
                {primaryRoutine.streak > 3 && (
                  <div className="flex items-center gap-1 bg-orange-500/20 backdrop-blur-sm px-2 py-1 rounded-full border border-orange-300/30">
                    <Flame className="w-4 h-4 text-orange-300" />
                    <span className="text-sm font-semibold text-orange-100">{primaryRoutine.streak} day streak!</span>
                  </div>
                )}
              </div>
              <p className="text-white/80 text-sm mb-3">{primaryRoutine.description}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-white/90">{primaryRoutine.successRate}% success</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-blue-300" />
                  <span className="text-white/90">Last: {primaryRoutine.lastCompleted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Small Cards - Secondary Routines */}
      <div className="space-y-6">
        {secondaryRoutines.map((routine) => (
          <Card key={routine.id} className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="relative h-32">
              <img 
                src={routine.image}
                alt={routine.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                <div className="flex items-start justify-between">
                  <span className="text-lg">{routine.icon}</span>
                  <Switch 
                    checked={routine.active}
                    onCheckedChange={() => onToggleRoutine?.(routine.id)}
                    className="data-[state=checked]:bg-white/20 scale-75"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-1">{routine.name}</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80">{routine.successRate}% · {routine.frequency}</span>
                    {routine.streak > 0 && (
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-orange-200">{routine.streak}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}