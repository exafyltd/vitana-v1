export interface RecipeIngredient {
  qty: string;
  item: string;
  notes?: string;
  optional?: boolean;
}

export interface RecipeMacros {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface RecipePrep {
  timeMin: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
}

export interface RecipeSwap {
  label: string;
  replace?: Record<string, string>;
  remove?: string[];
}

export interface Recipe {
  recipeId: string;
  title: string;
  imageUrl: string;
  calories: number;
  macros: RecipeMacros;
  prep: RecipePrep;
  tags: string[];
  allergens: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  swaps: RecipeSwap[];
  slot: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
}

export interface DayPlan {
  day: number;
  meals: Recipe[];
}

export interface NutritionPlanData {
  planName: string;
  duration: string;
  days: DayPlan[];
  isGenerated: boolean;
  caloriesTarget?: number;
  proteinTarget?: number;
  dietaryRestrictions?: string[];
  // Autopilot overview data
  goalFocus?: string;
  schedule?: string;
  currentWeek?: number;
  totalWeeks?: number;
  completionPercentage?: number;
  aiInsight?: string;
  lastUpdated?: string;
}
