import { Skeleton } from "@/components/ui/skeleton";

interface ProfileSkeletonProps {
  variant?: "mobile" | "desktop";
}

/**
 * Premium skeleton loader for Profile page
 * Matches ProfileIdCardFront/Back layouts
 */
export function ProfileSkeleton({ variant = "desktop" }: ProfileSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="p-4 space-y-4">
        {/* ID Card Front skeleton */}
        <div className="rounded-3xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-6 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-6 w-12 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
          
          {/* Vitana Index */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Desktop variant - two ID cards side by side
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-blue-50/20 to-pink-50/30 dark:from-purple-950/10 dark:via-blue-950/10 dark:to-pink-950/10">
      <section className="mx-auto max-w-6xl px-4 py-8">
        {/* Two ID Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Front Card */}
          <div className="rounded-3xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
            
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          
          {/* Back Card */}
          <div className="rounded-3xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-8 space-y-6">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full max-w-[200px] mx-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <Skeleton className="h-12 w-full max-w-lg rounded-full mb-8" />
        
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </section>
    </div>
  );
}
