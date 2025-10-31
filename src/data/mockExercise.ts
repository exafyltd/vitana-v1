import { Workout, ExercisePlanData } from '@/types/exercise';

const workouts: Workout[] = [
  {
    workoutId: 'full-body-flow-1',
    day: 'Day 1',
    title: 'Full Body Flow',
    description: 'Dynamic compound movements for strength and mobility',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=900&fit=crop',
    duration: 45,
    caloriesBurned: 350,
    difficulty: 'Intermediate',
    muscleGroups: ['Full Body', 'Core'],
    equipment: ['bodyweight', 'dumbbells'],
    mode: 'Guided Video',
    status: 'updated',
    aiNote: 'Reduced set volume to improve recovery readiness based on your sleep data.',
    exercises: [
      { name: 'Dynamic Warm-Up', sets: 1, reps: '5 minutes', restSeconds: 0, notes: 'Arm circles, leg swings, cat-cow stretches' },
      { name: 'Goblet Squats', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Hold dumbbell at chest height' },
      { name: 'Push-Ups (Modified)', sets: 3, reps: '10-12', restSeconds: 60, notes: 'Knee modification available' },
      { name: 'Dumbbell Rows', sets: 3, reps: '10-12 each arm', restSeconds: 60, notes: 'Keep back flat, pull elbow back' },
      { name: 'Plank Hold', sets: 3, reps: '30 seconds', restSeconds: 45, notes: 'Maintain neutral spine' },
      { name: 'Cool Down Stretch', sets: 1, reps: '5 minutes', restSeconds: 0, notes: 'Focus on major muscle groups' }
    ]
  },
  {
    workoutId: 'core-mobility-1',
    day: 'Day 2',
    title: 'Core & Mobility',
    description: 'Low-impact core strengthening and flexibility work',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&h=900&fit=crop',
    duration: 30,
    caloriesBurned: 180,
    difficulty: 'Beginner',
    muscleGroups: ['Core', 'Hip Flexors'],
    equipment: ['mat'],
    mode: 'Manual Routine',
    status: 'default',
    exercises: [
      { name: 'Cat-Cow Stretch', sets: 2, reps: '10 reps', restSeconds: 30, notes: 'Move slowly with breath' },
      { name: 'Bird Dog', sets: 3, reps: '8 each side', restSeconds: 45, notes: 'Maintain balance and control' },
      { name: 'Dead Bug', sets: 3, reps: '10 reps', restSeconds: 45, notes: 'Press lower back into mat' },
      { name: 'Side Plank', sets: 2, reps: '20 seconds each side', restSeconds: 60, notes: 'Stack feet or stagger for easier variation' },
      { name: 'Hip Circles', sets: 2, reps: '10 each direction', restSeconds: 30, notes: 'Improve hip mobility' }
    ]
  },
  {
    workoutId: 'upper-body-strength-1',
    day: 'Day 3',
    title: 'Upper Body Strength',
    description: 'Build strength in chest, back, shoulders, and arms',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&h=900&fit=crop',
    duration: 40,
    caloriesBurned: 320,
    difficulty: 'Intermediate',
    muscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms'],
    equipment: ['dumbbells', 'resistance-bands'],
    mode: 'Guided Video',
    status: 'default',
    exercises: [
      { name: 'Dumbbell Chest Press', sets: 4, reps: '10-12', restSeconds: 90, notes: 'Can be done on floor or bench' },
      { name: 'Bent-Over Rows', sets: 4, reps: '10-12', restSeconds: 90, notes: 'Hinge at hips, keep back flat' },
      { name: 'Shoulder Press', sets: 3, reps: '10-12', restSeconds: 60, notes: 'Press dumbbells overhead' },
      { name: 'Bicep Curls', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Control the negative' },
      { name: 'Tricep Extensions', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Keep elbows stable' },
      { name: 'Resistance Band Pull-Aparts', sets: 3, reps: '15-20', restSeconds: 45, notes: 'Great for shoulder health' }
    ]
  },
  {
    workoutId: 'active-recovery-1',
    day: 'Day 4',
    title: 'Active Recovery Walk',
    description: 'Gentle movement to promote blood flow and recovery',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&h=900&fit=crop',
    duration: 30,
    caloriesBurned: 150,
    difficulty: 'Beginner',
    muscleGroups: ['Full Body'],
    equipment: ['bodyweight'],
    mode: 'Manual Routine',
    status: 'default',
    aiNote: 'Added based on your recent high-intensity workouts for optimal recovery.',
    exercises: [
      { name: 'Brisk Walk', sets: 1, reps: '20 minutes', restSeconds: 0, notes: 'Maintain comfortable pace, focus on breathing' },
      { name: 'Gentle Stretching', sets: 1, reps: '10 minutes', restSeconds: 0, notes: 'Focus on tight areas from previous workouts' }
    ]
  },
  {
    workoutId: 'lower-body-power-1',
    day: 'Day 5',
    title: 'Lower Body Power',
    description: 'Build leg strength and explosive power',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&h=900&fit=crop',
    duration: 45,
    caloriesBurned: 400,
    difficulty: 'Intermediate',
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings', 'Calves'],
    equipment: ['dumbbells', 'bodyweight'],
    mode: 'Guided Video',
    status: 'default',
    exercises: [
      { name: 'Goblet Squats', sets: 4, reps: '12-15', restSeconds: 90, notes: 'Focus on depth and control' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10 each leg', restSeconds: 90, notes: 'Rear foot elevated on bench/chair' },
      { name: 'Romanian Deadlifts', sets: 4, reps: '10-12', restSeconds: 90, notes: 'Hinge at hips, feel hamstring stretch' },
      { name: 'Jump Squats', sets: 3, reps: '8-10', restSeconds: 120, notes: 'Land softly, explosive movement' },
      { name: 'Calf Raises', sets: 3, reps: '15-20', restSeconds: 60, notes: 'Full range of motion' }
    ]
  },
  {
    workoutId: 'hiit-cardio-1',
    day: 'Day 6',
    title: 'HIIT Cardio Blast',
    description: 'High-intensity intervals for cardiovascular fitness',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=900&fit=crop',
    duration: 25,
    caloriesBurned: 280,
    difficulty: 'Advanced',
    muscleGroups: ['Full Body', 'Cardio'],
    equipment: ['bodyweight'],
    mode: 'Guided Video',
    status: 'default',
    exercises: [
      { name: 'Jumping Jacks', sets: 4, reps: '30 seconds', restSeconds: 30, notes: 'High intensity' },
      { name: 'Burpees', sets: 4, reps: '30 seconds', restSeconds: 30, notes: 'Modify by stepping back if needed' },
      { name: 'Mountain Climbers', sets: 4, reps: '30 seconds', restSeconds: 30, notes: 'Keep core tight' },
      { name: 'High Knees', sets: 4, reps: '30 seconds', restSeconds: 30, notes: 'Drive knees up high' },
      { name: 'Plank Jacks', sets: 4, reps: '30 seconds', restSeconds: 30, notes: 'Maintain plank position' }
    ]
  },
  {
    workoutId: 'rest-day-1',
    day: 'Day 7',
    title: 'Complete Rest',
    description: 'Recovery day - focus on sleep, nutrition, and gentle stretching',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=900&fit=crop',
    duration: 0,
    caloriesBurned: 0,
    difficulty: 'Beginner',
    muscleGroups: [],
    equipment: [],
    mode: 'Manual Routine',
    status: 'default',
    exercises: [
      { name: 'Optional Light Stretching', sets: 1, reps: '10-15 minutes', restSeconds: 0, notes: 'Focus on tight or sore areas' }
    ]
  }
];

export const mockExercisePlan: ExercisePlanData = {
  goalFocus: 'Strength & Mobility',
  sessionsPerWeek: 4,
  avgDuration: 42,
  currentWeek: 2,
  totalWeeks: 4,
  completionPercentage: 65,
  aiInsight: 'Autopilot adjusted today\'s routine for better recovery after yesterday\'s activity.',
  workouts,
  progress: {
    workoutsCompleted: 3,
    workoutsTotal: 4,
    avgWorkoutTime: 42,
    totalCaloriesBurned: 1050,
    recoveryScore: 83,
    consistency: 75
  },
  isGenerated: true
};
