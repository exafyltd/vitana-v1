import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Clock,
  ChefHat,
  Plus,
  Minus,
  Heart,
  ShoppingCart,
  Repeat,
  AlertTriangle,
  Flame,
  Apple,
  X,
  ArrowLeft,
  Leaf,
  Candy,
} from "lucide-react";
import { Recipe } from "@/types/recipe";
import { scaleQuantity } from "@/lib/recipeUtils";
import { toast } from "sonner";
import { MacroRings } from "./MacroRings";
import { CookModeFullScreen } from "./CookModeFullScreen";
import { notifyInfo, notifySuccess } from '@/lib/i18n-toast';

interface RecipeSheetProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MacroChip({ 
  icon: Icon, 
  label, 
  value, 
  color = 'blue' 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color?: 'blue' | 'teal' | 'gold' | 'green' | 'purple' 
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
    teal: 'bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300',
    gold: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    green: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300'
  };
  
  return (
    <div className={`
      flex flex-col items-center gap-1 p-3 rounded-xl border backdrop-blur-sm 
      ${colorClasses[color]} transition-all hover:scale-105
    `}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export function RecipeSheet({ recipe, open, onOpenChange }: RecipeSheetProps) {
  const [servings, setServings] = useState(recipe?.prep.servings || 1);
  const [fullScreenCookMode, setFullScreenCookMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    if (recipe) {
      setServings(recipe.prep.servings);
      setCheckedIngredients(new Set());
      setScrolled(false);
    }
  }, [recipe]);
  
  useEffect(() => {
    const handleScroll = (e: any) => {
      const scrollTop = e.target.scrollTop;
      setScrolled(scrollTop > 100);
    };
    
    const contentEl = document.querySelector('[data-recipe-scroll]');
    contentEl?.addEventListener('scroll', handleScroll);
    
    return () => contentEl?.removeEventListener('scroll', handleScroll);
  }, [open]);
  
  if (!recipe) return null;
  
  const scaleFactor = servings / recipe.prep.servings;
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-2xl p-0 backdrop-blur-xl bg-background/95 border-l border-border/50 shadow-2xl"
        >
          <div data-recipe-scroll className="h-full overflow-y-auto">
            {/* Sticky mini header (shows on scroll) */}
            <div 
              className={`
                sticky top-0 z-10 transition-all duration-300
                ${scrolled 
                  ? 'backdrop-blur-xl bg-background/95 border-b shadow-md' 
                  : 'opacity-0 pointer-events-none'
                }
              `}
            >
              <div className="flex items-center justify-between px-6 py-3">
                <h3 className="font-semibold truncate">{recipe.title}</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{recipe.calories} cal</Badge>
                  <Badge variant="outline" className="text-xs">{recipe.prep.timeMin} min</Badge>
                </div>
              </div>
            </div>
            
            {/* Hero Image with Enhanced Overlay */}
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              
              {/* Bottom Fade Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  {recipe.title}
                </h2>
              </div>
              
              {/* Close Button (top-right) */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              {/* Back Arrow (mobile only) */}
              <button
                onClick={() => onOpenChange(false)}
                className="md:hidden absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
        
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Tags */}
              <div className="flex gap-2 flex-wrap">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
              
              {/* Macro Chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <MacroChip icon={Flame} label="Cal" value={recipe.calories} color="gold" />
                <MacroChip icon={Apple} label="Protein" value={`${recipe.macros.protein}g`} color="blue" />
                <MacroChip icon={Apple} label="Carbs" value={`${recipe.macros.carbs}g`} color="teal" />
                <MacroChip icon={Apple} label="Fat" value={`${recipe.macros.fat}g`} color="purple" />
                <MacroChip icon={Apple} label="Fiber" value={`${recipe.macros.fiber}g`} color="green" />
                <MacroChip icon={Candy} label="Sugar" value={`${recipe.macros.sugar}g`} color="gold" />
              </div>
              
              {/* Macro Rings Visualization */}
              <MacroRings macros={recipe.macros} calories={recipe.calories} />
          
              {/* Prep Row */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex gap-4">
                  <div className="text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{recipe.prep.timeMin} min</span>
                  </div>
                  <div className="text-sm flex items-center gap-1">
                    <ChefHat className="w-4 h-4 text-muted-foreground" />
                    <span>{recipe.prep.difficulty}</span>
                  </div>
                </div>
                
                {/* Servings Adjuster */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[70px] text-center">
                    {servings} {servings === 1 ? 'serving' : 'servings'}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setServings(servings + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
          
              {/* Allergens */}
              {recipe.allergens.length > 0 && (
                <Alert className="border-amber-500/20 bg-amber-500/5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertTitle>Allergens</AlertTitle>
                  <AlertDescription>
                    Contains: {recipe.allergens.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
          
              {/* Ingredients Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Ingredients</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => notifySuccess('toasts.health.addedShoppingList')}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to List
                  </Button>
                </div>
                <div className="space-y-2">
                  {recipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={checkedIngredients.has(idx)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(checkedIngredients);
                          checked ? newSet.add(idx) : newSet.delete(idx);
                          setCheckedIngredients(newSet);
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <span className={checkedIngredients.has(idx) ? 'line-through text-muted-foreground' : ''}>
                          <strong>{scaleQuantity(ing.qty, scaleFactor)}</strong> {ing.item}
                        </span>
                        {ing.optional && (
                          <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                        )}
                        {ing.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{ing.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          
              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Instructions</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullScreenCookMode(true)}
                  >
                    👁 Cook Mode
                  </Button>
                </div>
                
                <ol className="space-y-3">
                  {recipe.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
          
              {/* Swaps with Icons */}
              {recipe.swaps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-primary" />
                    Recipe Swaps
                  </h3>
                  <div className="space-y-2">
                    {recipe.swaps.map((swap, idx) => {
                      const isVegan = swap.label.toLowerCase().includes('vegan');
                      const isSugar = swap.label.toLowerCase().includes('sugar');
                      const SwapIcon = isVegan ? Leaf : isSugar ? Candy : Repeat;
                      const iconColor = isVegan ? 'text-green-500' : isSugar ? 'text-amber-500' : 'text-primary';
                      
                      return (
                        <button
                          key={idx}
                          className="w-full p-4 rounded-xl border border-border bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/30 transition-all hover:scale-[1.02] hover:shadow-md flex items-start gap-3 text-left"
                          onClick={() => {
                            toast.info(`Applying: ${swap.label}`);
                          }}
                        >
                          <SwapIcon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                          
                          <div className="flex-1">
                            <p className="font-medium text-sm">{swap.label}</p>
                            {swap.replace && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {Object.entries(swap.replace).map(([from, to]) => (
                                  <span key={from}>
                                    Replace <strong>{from}</strong> with <strong>{to}</strong>
                                  </span>
                                ))}
                              </p>
                            )}
                            {swap.remove && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Remove: {swap.remove.join(', ')}
                              </p>
                            )}
                          </div>
                          
                          {isVegan && (
                            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                              vegan
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          
              {/* Notes */}
              <div>
                <Label htmlFor="notes">Personal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add your cooking notes..."
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          
          {/* Enhanced Footer Actions */}
          <SheetFooter className="p-6 border-t border-border/50 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent backdrop-blur-md">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 gap-2 hover:scale-[1.02] transition-all"
                onClick={() => notifySuccess('toasts.health.recipeSavedFavorites')}
              >
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1 gap-2 hover:scale-[1.02] transition-all"
                onClick={() => notifyInfo('toasts.health.findingSimilarRecipes')}
              >
                <Repeat className="w-4 h-4" />
                <span className="hidden sm:inline">Replace</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1 gap-2 hover:scale-[1.02] transition-all"
                onClick={() => notifySuccess('toasts.health.addedFoodDiary')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Diary</span>
              </Button>
              
              <Button 
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 hover:scale-[1.02] transition-all border-0"
                onClick={() => notifySuccess('toasts.health.addedShoppingList')}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Shop</span>
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Full-Screen Cook Mode */}
      {fullScreenCookMode && (
        <CookModeFullScreen
          steps={recipe.steps}
          recipeName={recipe.title}
          heroImage={recipe.imageUrl}
          onExit={() => setFullScreenCookMode(false)}
        />
      )}
    </>
  );
}
