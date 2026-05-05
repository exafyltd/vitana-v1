import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface EventCardSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Premium skeleton loader matching NewsCard event layout
 * Used for mobile event carousel loading state
 */
export function EventCardSkeleton({ count = 4, className }: EventCardSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "relative overflow-hidden rounded-2xl",
            "bg-gradient-to-br from-muted/60 via-muted/40 to-muted/20",
            "backdrop-blur-sm border border-white/10",
            "shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
            "min-h-[280px]"
          )}
          style={{
            animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
            animationDelay: `${index * 150}ms`
          }}
        >
          {/* Shimmer overlay effect */}
          <div 
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)'
            }}
          />
          
          {/* Content structure matching NewsCard */}
          <div className="absolute inset-0 p-6 flex flex-col">
            {/* Top row - category badge + timestamp */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-md bg-white/10" />
                <Skeleton className="h-6 w-14 rounded-md bg-white/10" />
              </div>
              <Skeleton className="h-6 w-24 rounded-md bg-white/10" />
            </div>
            
            {/* Spacer to push content to bottom */}
            <div className="flex-1" />
            
            {/* Bottom content - title, description, meta */}
            <div className="space-y-3">
              {/* Title */}
              <Skeleton className="h-6 w-4/5 rounded bg-white/15" />
              
              {/* Description lines */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded bg-white/10" />
                <Skeleton className="h-4 w-3/4 rounded bg-white/10" />
              </div>
              
              {/* Meta row - author + location/attendees */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full bg-white/15" />
                  <Skeleton className="h-3 w-20 rounded bg-white/10" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16 rounded bg-white/10" />
                  <Skeleton className="h-3 w-10 rounded bg-white/10" />
                </div>
              </div>
            </div>
            
            {/* Action button skeleton - bottom right */}
            <div className="absolute bottom-6 right-6">
              <Skeleton className="h-9 w-24 rounded-full bg-white/15" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Minimal centered spinner fallback
 */
export function EventLoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        
        {/* Spinner */}
        <div 
          className="relative w-10 h-10 rounded-full border-2 border-muted border-t-primary animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
      </div>
      <p className="text-xs text-muted-foreground/70 mt-4 font-medium">
        {t('screens.events.loadingEvents')}
      </p>
    </div>
  );
}
