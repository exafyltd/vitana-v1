import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HorizontalCardSkeletonProps {
  variant?: 'standard' | 'visual';
  count?: number;
  className?: string;
}

export function HorizontalCardSkeleton({ 
  variant = 'standard', 
  count = 5,
  className 
}: HorizontalCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className={cn(
            "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm",
            variant === 'standard' ? 'min-h-[88px]' : 'min-h-[100px]',
            "px-4 py-3",
            className
          )}
          style={{
            animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
            animationDelay: `${index * 100}ms`
          }}
        >
          {variant === 'visual' ? (
            <div className="grid items-stretch grid-cols-1 lg:grid-cols-[36%_1fr_80px] gap-3">
              {/* Image skeleton with reserved height */}
              <div className="relative h-[100px] rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-muted/40" />
                <Skeleton className="absolute top-1.5 left-1.5 h-5 w-20" />
              </div>
              
              {/* Content skeleton */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex items-center gap-2 mt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              
              {/* Actions skeleton */}
              <div className="flex flex-col items-center justify-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Icon skeleton */}
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              
              {/* Content skeleton */}
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-5 w-2/5" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
              
              {/* Action skeleton */}
              <Skeleton className="h-8 w-20 rounded-lg flex-shrink-0" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
