import { useState } from "react";
import { Recipe } from "@/types/recipe";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ChefHat, Plus, Minus, Heart, ShoppingCart, Repeat, AlertTriangle } from "lucide-react";
import { scaleQuantity } from "@/lib/recipeUtils";
import { CookModeSteps } from "./CookModeSteps";
import { toast } from "sonner";

interface RecipeSheetProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MacroChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center p-2 bg-muted rounded-lg border border-border">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function RecipeSheet({ recipe, open, onOpenChange }: RecipeSheetProps) {
  const [servings, setServings] = useState(recipe?.prep.servings || 1);
  const [cookMode, setCookMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  
  if (!recipe) return null;
  
  const scaleFactor = servings / recipe.prep.servings;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Hero Image */}
        <div className="relative aspect-video w-full">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title + Tags */}
          <div>
            <h2 className="text-2xl font-bold mb-3">{recipe.title}</h2>
            <div className="flex gap-2 flex-wrap">
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>
          
          {/* Macro Chips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MacroChip label="Cal" value={recipe.calories} />
            <MacroChip label="Protein" value={`${recipe.macros.protein}g`} />
            <MacroChip label="Carbs" value={`${recipe.macros.carbs}g`} />
            <MacroChip label="Fat" value={`${recipe.macros.fat}g`} />
            <MacroChip label="Fiber" value={`${recipe.macros.fiber}g`} />
            <MacroChip label="Sugar" value={`${recipe.macros.sugar}g`} />
          </div>
          
          {/* Prep Row */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex gap-4">
              <div className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {recipe.prep.timeMin} min
              </div>
              <div className="text-sm flex items-center gap-1">
                <ChefHat className="w-4 h-4" />
                {recipe.prep.difficulty}
              </div>
            </div>
            
            {/* Servings Adjuster */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setServings(Math.max(1, servings - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {servings} {servings === 1 ? 'serving' : 'servings'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setServings(servings + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Allergens */}
          {recipe.allergens.length > 0 && (
            <Alert className="border-orange-500/50 bg-orange-500/5">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <AlertTitle>Allergen Warning</AlertTitle>
              <AlertDescription>
                Contains: {recipe.allergens.join(', ')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Ingredients Checklist */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`ingredient-${idx}`}
                    checked={checkedIngredients.has(idx)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(checkedIngredients);
                      checked ? newSet.add(idx) : newSet.delete(idx);
                      setCheckedIngredients(newSet);
                    }}
                  />
                  <Label
                    htmlFor={`ingredient-${idx}`}
                    className="flex-1 cursor-pointer"
                  >
                    <span className={checkedIngredients.has(idx) ? 'line-through text-muted-foreground' : ''}>
                      <span className="font-medium">{scaleQuantity(ing.qty, scaleFactor)}</span> {ing.item}
                    </span>
                    {ing.optional && (
                      <Badge variant="outline" className="ml-2 text-xs">Optional</Badge>
                    )}
                    {ing.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{ing.notes}</p>
                    )}
                  </Label>
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
                onClick={() => setCookMode(!cookMode)}
              >
                {cookMode ? 'Exit Cook Mode' : 'Cook Mode'}
              </Button>
            </div>
            
            {cookMode ? (
              <CookModeSteps steps={recipe.steps} />
            ) : (
              <ol className="space-y-3 list-decimal list-inside">
                {recipe.steps.map((step, idx) => (
                  <li key={idx} className="text-sm leading-relaxed pl-2">{step}</li>
                ))}
              </ol>
            )}
          </div>
          
          {/* Swaps */}
          {recipe.swaps.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Swaps & Variations</h3>
              <div className="space-y-2">
                {recipe.swaps.map((swap, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      toast.info(`Applying: ${swap.label}`);
                    }}
                  >
                    <Repeat className="w-4 h-4 mr-2" />
                    {swap.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div>
            <Label htmlFor="notes">Personal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add your cooking notes, modifications, or thoughts..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>
        
        {/* Footer Actions */}
        <SheetFooter className="p-6 border-t sticky bottom-0 bg-background">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => toast.success('Added to food diary')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Diary
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => toast.success('Added to shopping list')}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Shopping List
            </Button>
            <Button 
              className="flex-1"
              onClick={() => toast.success('Recipe saved to favorites')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
