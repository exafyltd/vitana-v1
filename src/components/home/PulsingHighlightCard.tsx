import { NewsCard, NewsCardProps } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface PulsingHighlightCardProps extends NewsCardProps {
  featured?: boolean;
  rewardPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export function PulsingHighlightCard({ 
  featured = true,
  rewardPosition = "bottom-right",
  className,
  ...props 
}: PulsingHighlightCardProps) {
  return (
    <div className="relative">
      {featured && (
        <div 
          className="absolute -top-3 -right-3 z-50 bg-gradient-to-r from-[hsl(var(--gradient-play-start))] to-[hsl(var(--gradient-play-end))] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg transition-transform duration-150 ease-out hover:scale-[1.02]"
        >{t('screens.home.featured')}
        </div>
      )}
      <NewsCard
        {...props}
        rewardPosition={rewardPosition}
        className={cn(
          'transition-all duration-300',
          featured && 'shadow-xl hover:shadow-2xl transition-shadow',
          className
        )}
      />
    </div>
  );
}
