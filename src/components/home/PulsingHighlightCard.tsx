import { NewsCard, NewsCardProps } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';

interface PulsingHighlightCardProps extends NewsCardProps {
  featured?: boolean;
}

export function PulsingHighlightCard({ 
  featured = true,
  className,
  ...props 
}: PulsingHighlightCardProps) {
  return (
    <div className="relative">
      {featured && (
        <div 
          className="absolute -top-3 -right-3 z-10 bg-gradient-to-r from-gradient-play-start to-gradient-play-end text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
        >
          ⭐ FEATURED
        </div>
      )}
      <NewsCard
        {...props}
        className={cn(
          'transition-all duration-300',
          featured && 'animate-pulse-glow shadow-xl hover:shadow-2xl',
          className
        )}
      />
    </div>
  );
}
