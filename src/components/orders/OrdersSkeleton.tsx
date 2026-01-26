import { Skeleton } from "@/components/ui/skeleton";

interface OrdersSkeletonProps {
  count?: number;
}

/**
 * Premium skeleton loader for Orders page
 * Matches MobileOrdersView card layout
 */
export function OrdersSkeleton({ count = 4 }: OrdersSkeletonProps) {
  return (
    <div className="p-4 space-y-4 pb-32">
      {/* Header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Tab bar skeleton */}
      <Skeleton className="h-10 w-48 rounded-full" />
      
      {/* Order cards */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4"
          >
            <div className="flex gap-4">
              {/* Product image */}
              <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
              
              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                
                <Skeleton className="h-4 w-32" />
                
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty state hint */}
      <div className="text-center pt-4">
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
