import { Skeleton } from "@/components/ui/skeleton";

interface BusinessHubSkeletonProps {
  variant?: "mobile" | "desktop";
}

/**
 * Premium skeleton loader for Business Hub page
 * Matches MobileKPIStrip + MobileEarningPortal layouts
 */
export function BusinessHubSkeleton({ variant = "mobile" }: BusinessHubSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="p-4 space-y-4">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        
        {/* Action rail skeleton */}
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-9 w-24 rounded-full shrink-0" />
          <Skeleton className="h-9 w-20 rounded-full shrink-0" />
        </div>
        
        {/* Tab bar skeleton */}
        <Skeleton className="h-10 w-full rounded-full" />
        
        {/* KPI Strip skeleton - 4 metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-3"
            >
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-12 mt-1" />
            </div>
          ))}
        </div>
        
        {/* Earning Portal skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4 space-y-4">
          <Skeleton className="h-5 w-32" />
          
          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recent Activity skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="p-6 space-y-6">
      {/* Header cards */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-2xl bg-muted/30 p-8 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="w-32 h-32 rounded-2xl" />
        <Skeleton className="w-32 h-32 rounded-2xl" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-28" />
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
