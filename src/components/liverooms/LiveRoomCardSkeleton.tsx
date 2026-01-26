import { Skeleton } from "@/components/ui/skeleton";

interface LiveRoomCardSkeletonProps {
  count?: number;
  variant?: "grid" | "carousel";
}

/**
 * Premium skeleton loader for Live Room cards
 * Matches the LiveRoomCard layout with glassy effects
 */
export function LiveRoomCardSkeleton({ count = 3, variant = "grid" }: LiveRoomCardSkeletonProps) {
  const cards = Array.from({ length: count });

  if (variant === "carousel") {
    return (
      <div className="flex gap-3 overflow-hidden">
        {cards.map((_, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[280px] rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 overflow-hidden"
          >
            {/* Video thumbnail skeleton */}
            <Skeleton className="w-full h-40 rounded-none" />
            
            {/* Content area */}
            <div className="p-3 space-y-2">
              {/* Live badge + viewers */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              
              {/* Title */}
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              
              {/* Host info */}
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              
              {/* Tags */}
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid variant
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((_, index) => (
        <div
          key={index}
          className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 overflow-hidden animate-pulse"
        >
          {/* Video thumbnail skeleton */}
          <div className="relative">
            <Skeleton className="w-full h-48 rounded-none" />
            {/* Live indicator overlay */}
            <div className="absolute top-3 left-3">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="absolute top-3 right-3">
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          
          {/* Content area */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-2/3" />
            
            {/* Host info */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            
            {/* Action button */}
            <Skeleton className="h-10 w-full rounded-lg mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
