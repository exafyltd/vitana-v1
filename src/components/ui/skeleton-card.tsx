import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("p-3.5 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 animate-pulse", className)}>
      <div className="h-4 bg-muted/50 rounded mb-3 w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-muted/50 rounded w-1/2" />
        <div className="h-3 bg-muted/50 rounded w-full" />
        <div className="h-3 bg-muted/50 rounded w-2/3" />
      </div>
      <div className="h-8 bg-muted/50 rounded mt-4" />
    </div>
  );
}
