import { useState, useMemo } from "react";
import { Recipe, NutritionPlanData } from "@/types/recipe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { RecipeCard } from "./RecipeCard";
import { RecipeSheet } from "./RecipeSheet";
import { NutritionEmptyState } from "./NutritionEmptyState";
import { NutritionOverviewCard } from "./NutritionOverviewCard";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockNutritionPlan } from "@/data/mockRecipes";
import { t } from '@/lib/i18n-toast';

function sortMealsBySlot(meals: Recipe[]): Recipe[] {
  const order = { breakfast: 0, snack1: 1, lunch: 2, snack2: 3, dinner: 4 };
  return [...meals].sort((a, b) => order[a.slot] - order[b.slot]);
}

export function NutritionPlanView() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const { plans } = useHealthPlans();
  const nutritionPlan = plans?.find(p => p.plan_type === 'nutrition');
  const planData = (nutritionPlan?.plan_data as unknown as NutritionPlanData | undefined) || mockNutritionPlan;
  
  // If no plan, show empty state
  if (!planData?.isGenerated) {
    return <NutritionEmptyState />;
  }
  
  // Filter logic
  const filteredMeals = useMemo(() => {
    let meals = planData.days.flatMap(day => day.meals);
    
    // Tab filter
    if (activeTab !== 'all') {
      meals = meals.filter(m => {
        if (activeTab === 'snacks') return m.slot.includes('snack');
        return m.slot === activeTab;
      });
    }
    
    return meals;
  }, [planData, activeTab]);
  
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
        {/* Autopilot Overview Card */}
        <NutritionOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate nutrition plan');
          }}
        />
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-muted/50">
            <TabsTrigger value="all">{t('screens.health.all')}</TabsTrigger>
            <TabsTrigger value="breakfast">{t('screens.health.breakfast')}</TabsTrigger>
            <TabsTrigger value="lunch">{t('screens.health.lunch')}</TabsTrigger>
            <TabsTrigger value="dinner">{t('screens.health.dinner')}</TabsTrigger>
            <TabsTrigger value="snacks">{t('screens.health.snacks')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {mealsByDay.size === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">{t('screens.health.noRecipesMatchYourFilters')}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Array.from(mealsByDay.entries()).map(([day, meals]) => (
                  <div key={day}>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />{t('screens.health.dayDay', { day })}</h3>
                    
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
