import { cn } from "@/lib/utils";
import { categoryThemes } from "@/lib/categoryThemes";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryInfo {
  category: string;
  groupCount: number;
}

interface CategoryFilterBarProps {
  categories: CategoryInfo[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilterBar({
  categories,
  activeCategory,
  onCategoryChange
}: CategoryFilterBarProps) {
  const allCount = categories.reduce((sum, cat) => sum + cat.groupCount, 0);
  
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {/* All Tab */}
          <button
            onClick={() => onCategoryChange('all')}
            className={cn(
              "relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeCategory === 'all'
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            All ({allCount})
            {activeCategory === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500" />
            )}
          </button>

          {/* Category Tabs */}
          {categories.map(({ category, groupCount }) => {
            const theme = categoryThemes[category] || categoryThemes.Other;
            const isActive = activeCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                  isActive
                    ? cn("text-white shadow-lg", theme.buttonColor)
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <span>{theme.icon}</span>
                <span>{category}</span>
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded text-xs",
                  isActive ? "bg-white/20" : "bg-background/50"
                )}>
                  {groupCount}
                </span>
                {isActive && (
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r",
                    theme.gradient
                  )} />
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
