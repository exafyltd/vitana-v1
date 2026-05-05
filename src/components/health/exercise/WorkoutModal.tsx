import { useState } from "react";
import { Workout } from "@/types/exercise";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Flame, 
  Dumbbell, 
  Brain, 
  Play, 
  CheckCircle2,
  ArrowLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifySuccess, t } from '@/lib/i18n-toast';

interface WorkoutModalProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkoutModal({ workout, open, onOpenChange }: WorkoutModalProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timerMode, setTimerMode] = useState(false);
  
  if (!workout) return null;
  
  const isRestDay = workout.duration === 0;
  
  const difficultyColors = {
    Beginner: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    Intermediate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    Advanced: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
  };
  
  const handleStartWorkout = () => {
    setTimerMode(true);
    setCurrentExercise(0);
    notifySuccess('toasts.health.workoutStarted');
  };
  
  const handleCompleteWorkout = () => {
    notifySuccess('toasts.health.workoutCompletedGreatJob');
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto p-0 
          backdrop-blur-xl bg-white/90 dark:bg-slate-900/90"
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={workout.imageUrl}
            alt={workout.title}
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full 
              bg-white/20 backdrop-blur-md hover:bg-white/30 
              flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={() => onOpenChange(false)}
            className="md:hidden absolute top-4 left-4 w-10 h-10 rounded-full 
              bg-white/20 backdrop-blur-md hover:bg-white/30 
              flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90">
                {workout.day}
              </Badge>
              <Badge 
                variant="secondary" 
                className={cn("text-xs", difficultyColors[workout.difficulty])}
              >
                {workout.difficulty}
              </Badge>
              <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 text-xs">
                {workout.mode}
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {workout.title}
            </h2>
            <p className="text-sm text-white/90 mt-1">{workout.description}</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {!isRestDay && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 
                dark:from-blue-950/30 dark:to-cyan-950/30 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">{t('screens.health.duration')}</p>
                <p className="text-sm font-bold">{workout.duration} min</p>
              </div>
              
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 
                dark:from-amber-950/30 dark:to-orange-950/30 text-center">
                <Flame className="w-5 h-5 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-muted-foreground">{t('screens.health.calories')}</p>
                <p className="text-sm font-bold">{workout.caloriesBurned} kcal</p>
              </div>
              
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 
                dark:from-violet-950/30 dark:to-purple-950/30 text-center">
                <Dumbbell className="w-5 h-5 mx-auto mb-1 text-violet-600 dark:text-violet-400" />
                <p className="text-xs text-muted-foreground">{t('screens.health.exercises')}</p>
                <p className="text-sm font-bold">{workout.exercises.length}</p>
              </div>
            </div>
          )}
          
          {workout.muscleGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('screens.health.targetMuscles')}</h3>
              <div className="flex flex-wrap gap-2">
                {workout.muscleGroups.map(muscle => (
                  <Badge key={muscle} variant="outline">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {workout.equipment.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('screens.health.equipmentNeeded')}</h3>
              <div className="flex flex-wrap gap-2">
                {workout.equipment.map(eq => (
                  <Badge key={eq} variant="secondary" className="capitalize">
                    {eq.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {workout.aiNote && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 
              dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-200/30 dark:border-blue-700/30">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">{t('screens.health.autopilotAdjustment')}</p>
                <p className="text-sm text-muted-foreground italic">
                  {workout.aiNote}
                </p>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-bold mb-4">{t('screens.health.exercises')}</h3>
            <div className="space-y-3">
              {workout.exercises.map((exercise, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    timerMode && idx === currentExercise 
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-500" 
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full 
                        bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm">{exercise.name}</h4>
                        {exercise.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    {timerMode && idx < currentExercise && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex gap-4 text-xs text-muted-foreground ml-11">
                    <span>
                      <strong>{t('screens.health.sets')}</strong> {exercise.sets}
                    </span>
                    <span>
                      <strong>{t('screens.health.reps')}</strong> {exercise.reps}
                    </span>
                    {exercise.restSeconds > 0 && (
                      <span>
                        <strong>{t('screens.health.rest')}</strong> {exercise.restSeconds}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t sticky bottom-0 bg-background/95 backdrop-blur-md">
          {!timerMode ? (
            <Button 
              className="w-full gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 
                hover:from-blue-600 hover:to-cyan-600"
              size="lg"
              onClick={handleStartWorkout}
              disabled={isRestDay}
            >
              <Play className="w-5 h-5" />
              {t('screens.health.startWorkout')}
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setCurrentExercise(Math.max(0, currentExercise - 1))}
                disabled={currentExercise === 0}
              >
                Previous
              </Button>
              
              {currentExercise === workout.exercises.length - 1 ? (
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={handleCompleteWorkout}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('screens.health.complete')}
                </Button>
              ) : (
                <Button 
                  className="flex-1"
                  onClick={() => setCurrentExercise(currentExercise + 1)}
                >
                  {t('screens.health.nextExercise')}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
