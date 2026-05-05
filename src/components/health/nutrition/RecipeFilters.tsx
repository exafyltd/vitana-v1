import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from "@/components/ui/responsive-popover";
import { SlidersHorizontal } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface RecipeFiltersProps {
  filters: {
    dietType: string[];
    calorieRange: [number, number];
    minProtein: number;
  };
  onFiltersChange: (filters: any) => void;
}

function getActiveFilterCount(filters: RecipeFiltersProps['filters']): number {
  let count = 0;
  if (filters.dietType.length > 0) count += filters.dietType.length;
  if (filters.minProtein > 0) count += 1;
  if (filters.calorieRange[0] > 0 || filters.calorieRange[1] < 1000) count += 1;
  return count;
}

export function RecipeFilters({ filters, onFiltersChange }: RecipeFiltersProps) {
  const activeCount = getActiveFilterCount(filters);
  
  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button variant="outline" className="gap-2 min-h-[44px]">
          <SlidersHorizontal className="w-4 h-4" />{t('screens.health.filters')}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeCount}
            </Badge>
          )}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent title={t('screens.health.filterRecipes')} className="w-80" align="end">
        <div className="space-y-4">
          
          {/* Diet Type */}
          <div>
            <Label className="mb-2 block">{t('screens.health.dietType')}</Label>
            <div className="flex flex-wrap gap-2">
              {['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'paleo'].map(diet => (
                <Badge
                  key={diet}
                  variant={filters.dietType.includes(diet) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newDiets = filters.dietType.includes(diet)
                      ? filters.dietType.filter(d => d !== diet)
                      : [...filters.dietType, diet];
                    onFiltersChange({ ...filters, dietType: newDiets });
                  }}
                >
                  {diet}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Calorie Range */}
          <div>
            <Label className="mb-2 block">{t('screens.health.calorieRangeValue0Value1Cal', { value0: filters.calorieRange[0], value1: filters.calorieRange[1] })}
            </Label>
            <Slider
              value={filters.calorieRange}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, calorieRange: value as [number, number] })
              }
              min={0}
              max={1000}
              step={50}
              className="mt-2"
            />
          </div>
          
          {/* Min Protein */}
          <div>
            <Label className="mb-2 block">{t('screens.health.minimumProteinMinproteinG', { minProtein: filters.minProtein })}
            </Label>
            <Slider
              value={[filters.minProtein]}
              onValueChange={([value]) =>
                onFiltersChange({ ...filters, minProtein: value })
              }
              min={0}
              max={50}
              step={5}
              className="mt-2"
            />
          </div>
          
          {/* Clear Filters */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() =>
                onFiltersChange({ dietType: [], calorieRange: [0, 1000], minProtein: 0 })
              }
            >{t('screens.health.clearAllFilters')}
            </Button>
          )}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
