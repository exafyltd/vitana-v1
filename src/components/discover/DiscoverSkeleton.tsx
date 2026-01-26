import { Skeleton } from "@/components/ui/skeleton";

interface DiscoverSkeletonProps {
  variant?: "mobile" | "desktop";
}

/**
 * Premium skeleton loader for Discover page
 * Matches MobileDiscoverView intent blocks layout
 */
export function DiscoverSkeleton({ variant = "mobile" }: DiscoverSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="p-4 space-y-4 pb-32">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        
        {/* Action rail skeleton */}
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <Skeleton className="h-9 w-24 rounded-full shrink-0" />
          <Skeleton className="h-9 w-20 rounded-full shrink-0" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        </div>
        
        {/* Intent blocks - Sleep, Nutrition, Move, Breathe */}
        <div className="space-y-3">
          {['😴 Sleep Better', '🥗 Eat Well', '🏃 Move More', '🧘 Breathe Deep'].map((title, i) => (
            <div
              key={i}
              className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              
              {/* Horizontal scroll of cards */}
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex-shrink-0 w-40 space-y-2">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Featured section skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-muted/20 p-3 space-y-2">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-24" />
      </div>
      
      {/* Tab bar */}
      <Skeleton className="h-10 w-96 rounded-full" />
      
      {/* AI Recommendations grid */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-56" />
        </div>
        <Skeleton className="h-4 w-80" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
