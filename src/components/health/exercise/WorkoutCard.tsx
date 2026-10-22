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
    Beginner: 'bg-green-500/10 text-green-700',
    Intermediate: 'bg-amber-500/10 text-amber-700',
    Advanced: 'bg-red-500/10 text-red-700'
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
        hasAIUpdate && "ring-2 ring-category-3/50 ring-offset-2"
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
        
        {/* design-allow-next-line: on-media scrim, theme-independent (gradient over the workout photo) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {hasAIUpdate && (
          <div className="absolute top-3 start-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full 
            bg-status-info/90 backdrop-blur-sm animate-pulse">
            <Brain className="w-3.5 h-3.5 text-primary-foreground" />
            <span className="text-xs font-medium text-primary-foreground">{t('screens.health.aiUpdated')}</span>
          </div>
        )}
        
        <div className="absolute top-3 end-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {workout.day}
          </Badge>
        </div>
        
        <div className="absolute bottom-0 start-0 end-0 p-4 text-primary-foreground">
          <h4 className="font-bold text-lg mb-2 line-clamp-1">{workout.title}</h4>
          
          <div className="flex items-center gap-3 flex-wrap">
            {!isRestDay && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{t('screens.health.durationMin', { duration: workout.duration })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{t('screens.health.caloriesburnedKcal', { caloriesBurned: workout.caloriesBurned })}</span>
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
              <Brain className="w-3.5 h-3.5 text-category-3 flex-shrink-0 mt-0.5" />
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
