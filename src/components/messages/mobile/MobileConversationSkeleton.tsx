import { Skeleton } from "@/components/ui/skeleton";

interface MobileConversationSkeletonProps {
  count?: number;
}

/**
 * Mobile-optimized skeleton loader for conversation list
 * Maintains layout consistency during loading
 */
export function MobileConversationSkeleton({ count = 5 }: MobileConversationSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="flex items-center gap-3 p-3 rounded-xl bg-card"
        >
          {/* Avatar skeleton */}
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
