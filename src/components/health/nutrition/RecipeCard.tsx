import { Recipe } from "@/types/recipe";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const fallbackImages: Record<string, string> = {
    breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&h=900&fit=crop',
    lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=900&fit=crop',
    dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&h=900&fit=crop',
    snack1: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=900&fit=crop',
    snack2: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=900&fit=crop'
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card border border-border"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = fallbackImages[recipe.slot] || fallbackImages.lunch;
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h4 className="font-semibold text-base mb-2 line-clamp-2">
            {recipe.title}
          </h4>
          
          {/* Macro Chips */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-white/90 text-foreground text-xs font-medium">{t('screens.health.caloriesCal', { calories: recipe.calories })}
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-foreground text-xs font-medium">
              {recipe.macros.protein}P
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-foreground text-xs font-medium">{t('screens.health.timeminMin', { timeMin: recipe.prep.timeMin })}
            </Badge>
          </div>
        </div>
        
        {/* Tags (top-right) */}
        {recipe.tags.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {recipe.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="bg-white/90 backdrop-blur-sm text-xs border-transparent">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
