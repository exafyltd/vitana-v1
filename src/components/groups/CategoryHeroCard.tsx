import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { CategoryTheme } from "@/lib/categoryThemes";
import { cn } from "@/lib/utils";

interface CategoryHeroCardProps {
  category: string;
  icon: string;
  matchScore: number;
  memberCount: number;
  groupCount: number;
  theme: CategoryTheme;
  onClick: () => void;
}

export function CategoryHeroCard({
  category,
  icon,
  matchScore,
  memberCount,
  groupCount,
  theme,
  onClick
}: CategoryHeroCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03]",
        theme.bg,
        "hover:" + theme.hoverGlow
      )}
      onClick={onClick}
    >
      <div className="aspect-[4/3] p-6 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="text-5xl mb-3">{icon}</div>
        
        {/* Category Name */}
        <h3 className="text-xl font-semibold mb-2">{category}</h3>
        
        {/* Stats */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium">{matchScore}% match</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{memberCount.toLocaleString()} members</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {groupCount} {groupCount === 1 ? 'group' : 'groups'}
          </div>
        </div>
        
        {/* CTA Button */}
        <Button 
          size="sm" 
          className={cn("text-white border-0", theme.buttonColor)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Explore Groups
        </Button>
      </div>
    </Card>
  );
}
