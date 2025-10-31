import { useState, useMemo } from "react";
import { Recipe, NutritionPlanData } from "@/types/recipe";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Search } from "lucide-react";
import { RecipeCard } from "./RecipeCard";
import { RecipeSheet } from "./RecipeSheet";
import { RecipeFilters } from "./RecipeFilters";
import { NutritionEmptyState } from "./NutritionEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockNutritionPlan } from "@/data/mockRecipes";

function sortMealsBySlot(meals: Recipe[]): Recipe[] {
  const order = { breakfast: 0, snack1: 1, lunch: 2, snack2: 3, dinner: 4 };
  return [...meals].sort((a, b) => order[a.slot] - order[b.slot]);
}

export function NutritionPlanView() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    dietType: [] as string[],
    calorieRange: [0, 1000] as [number, number],
    minProtein: 0
  });
  
  const { plans } = useHealthPlans();
  const nutritionPlan = plans?.find(p => p.plan_type === 'nutrition');
  const planData = (nutritionPlan?.plan_data as unknown as NutritionPlanData | undefined) || mockNutritionPlan;
  
  // If no plan, show empty state
  if (!planData?.isGenerated) {
    return <NutritionEmptyState />;
  }
  
  // Filter and search logic
  const filteredMeals = useMemo(() => {
    let meals = planData.days.flatMap(day => day.meals);
    
    // Tab filter
    if (activeTab !== 'all') {
      meals = meals.filter(m => {
        if (activeTab === 'snacks') return m.slot.includes('snack');
        return m.slot === activeTab;
      });
    }
    
    // Search filter
    if (searchQuery) {
      meals = meals.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.ingredients.some(i => i.item.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Diet filter
    if (filters.dietType.length > 0) {
      meals = meals.filter(m =>
        filters.dietType.every(diet => m.tags.includes(diet))
      );
    }
    
    // Calorie filter
    meals = meals.filter(m =>
      m.calories >= filters.calorieRange[0] &&
      m.calories <= filters.calorieRange[1]
    );
    
    // Protein filter
    if (filters.minProtein > 0) {
      meals = meals.filter(m => m.macros.protein >= filters.minProtein);
    }
    
    return meals;
  }, [planData, activeTab, searchQuery, filters]);
  
  // Group by day
  const mealsByDay = useMemo(() => {
    const grouped = new Map<number, Recipe[]>();
    planData.days.forEach(dayPlan => {
      const dayMeals = dayPlan.meals.filter(m =>
        filteredMeals.some(fm => fm.recipeId === m.recipeId)
      );
      if (dayMeals.length > 0) {
        grouped.set(dayPlan.day, dayMeals);
      }
    });
    return grouped;
  }, [planData, filteredMeals]);
  
  return (
    <>
      <div className="space-y-6">
        {/* Search + Filters Row */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>
          <RecipeFilters filters={filters} onFiltersChange={setFilters} />
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
            <TabsTrigger value="lunch">Lunch</TabsTrigger>
            <TabsTrigger value="dinner">Dinner</TabsTrigger>
            <TabsTrigger value="snacks">Snacks</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {mealsByDay.size === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">No recipes match your filters</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Array.from(mealsByDay.entries()).map(([day, meals]) => (
                  <div key={day}>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Day {day}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sortMealsBySlot(meals).map(recipe => (
                        <RecipeCard
                          key={recipe.recipeId}
                          recipe={recipe}
                          onClick={() => setSelectedRecipe(recipe)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Recipe Sheet Modal */}
      <RecipeSheet
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
      />
    </>
  );
}
