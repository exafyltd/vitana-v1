import { cn } from "@/lib/utils";

interface MobileProfileStatsProps {
  postsCount?: number;
  mediaCount?: number;
  groupsCount?: number;
  className?: string;
}

export function MobileProfileStats({
  postsCount = 0,
  mediaCount = 0,
  groupsCount = 0,
  className
}: MobileProfileStatsProps) {
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className={cn("flex items-center justify-center py-2", className)}>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatCount(postsCount)}</span>
        <span> Posts</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(mediaCount)}</span>
        <span> Media</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(groupsCount)}</span>
        <span> Groups</span>
      </p>
    </div>
  );
}
