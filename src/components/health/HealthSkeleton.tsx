import { Skeleton } from "@/components/ui/skeleton";

interface HealthSkeletonProps {
  variant?: "mobile" | "desktop";
}

/**
 * Premium skeleton loader for Health page
 * Matches MobileHealthSnapshot layout with circular index + pillar pills
 */
export function HealthSkeleton({ variant = "mobile" }: HealthSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background pb-32">
        {/* Health Snapshot Hero skeleton */}
        <div className="p-6 space-y-6">
          {/* Vitana Index circle */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Skeleton className="h-32 w-32 rounded-full" />
              {/* Inner score */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="h-12 w-16" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <Skeleton className="h-5 w-28 mx-auto" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
          </div>
          
          {/* Pillar pills - horizontal scroll */}
          <div className="flex gap-3 overflow-hidden justify-center">
            {['🥗', '💧', '🏃', '😴', '🧠'].map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center text-xl">
                  {emoji}
                </div>
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Priority Focus skeleton */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        
        {/* Autopilot Guidance skeleton */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        
        {/* Action Strip skeleton */}
        <div className="px-4">
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-32" />
      </div>
      
      {/* Three column hero */}
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      
      {/* Content cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
