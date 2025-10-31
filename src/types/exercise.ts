export type ExerciseEquipment = 
  | "bodyweight"
  | "dumbbells"
  | "resistance-bands"
  | "mat"
  | "barbell"
  | "kettlebell"
  | "machine";

export type ExerciseDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type WorkoutMode = "Guided Video" | "Manual Routine" | "Live Class";

export type WorkoutStatus = "default" | "updated" | "skipped" | "completed";

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string; // e.g., "12-15" or "30 seconds"
  restSeconds: number;
  notes?: string;
  videoUrl?: string;
}

export interface Workout {
  workoutId: string;
  day: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: number; // in minutes
  caloriesBurned: number;
  difficulty: ExerciseDifficulty;
  muscleGroups: string[];
  equipment: ExerciseEquipment[];
  mode: WorkoutMode;
  status: WorkoutStatus;
  aiNote?: string;
  exercises: WorkoutExercise[];
}

export interface ExerciseProgress {
  workoutsCompleted: number;
  workoutsTotal: number;
  avgWorkoutTime: number;
  totalCaloriesBurned: number;
  recoveryScore: number;
  consistency: number; // percentage
}

export interface ExercisePlanData {
  goalFocus: string; // e.g., "Strength & Mobility"
  sessionsPerWeek: number;
  avgDuration: number;
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  aiInsight: string;
  workouts: Workout[];
  progress: ExerciseProgress;
  isGenerated: boolean;
}
