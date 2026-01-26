import { Skeleton } from "@/components/ui/skeleton";

interface WalletSkeletonProps {
  variant?: "mobile" | "desktop";
}

/**
 * Premium skeleton loader for Wallet page
 * Matches MobileWalletBalanceCard and desktop layouts
 */
export function WalletSkeleton({ variant = "mobile" }: WalletSkeletonProps) {
  if (variant === "mobile") {
    return (
      <div className="p-4 space-y-4">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
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
        
        {/* Balance cards - 3 stacked */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm border border-white/10 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-16 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick actions skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-3 w-14" />
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
