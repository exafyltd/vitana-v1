import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workout } from "@/types/exercise";
import { Clock, Flame, Dumbbell, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface WorkoutCardProps {
  workout: Workout;
  onClick: () => void;
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const isRestDay = workout.duration === 0;
  const hasAIUpdate = workout.status === 'updated';
  
  const difficultyColors = {
    Beginner: 'bg-green-500/10 text-green-700 dark:text-green-400',
    Intermediate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Advanced: 'bg-red-500/10 text-red-700 dark:text-red-400'
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
        hasAIUpdate && "ring-2 ring-blue-500/50 ring-offset-2"
      )}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={workout.imageUrl}
          alt={workout.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {hasAIUpdate && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full 
            bg-blue-500/90 backdrop-blur-sm animate-pulse">
            <Brain className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white">{t('screens.health.aiUpdated')}</span>
          </div>
        )}
        
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            {workout.day}
          </Badge>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h4 className="font-bold text-lg mb-2 line-clamp-1">{workout.title}</h4>
          
          <div className="flex items-center gap-3 flex-wrap">
            {!isRestDay && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{workout.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{workout.caloriesBurned} kcal</span>
                </div>
              </>
            )}
            <Badge 
              variant="secondary" 
              className={cn("text-xs", difficultyColors[workout.difficulty])}
            >
              {workout.difficulty}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {workout.description}
        </p>
        
        {workout.muscleGroups.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {workout.muscleGroups.join(', ')}
            </span>
          </div>
        )}
        
        {workout.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {workout.equipment.map(eq => (
              <Badge key={eq} variant="outline" className="text-xs capitalize">
                {eq.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        )}
        
        <Badge variant="secondary" className="text-xs">
          {workout.mode}
        </Badge>
        
        {workout.aiNote && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2">
              <Brain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground italic">
                {workout.aiNote}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
