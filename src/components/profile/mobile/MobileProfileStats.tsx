import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileProfileStatsProps {
  userId?: string;
  className?: string;
}

export function MobileProfileStats({
  userId,
  className
}: MobileProfileStatsProps) {
  const { translate } = useTranslation();
  const { postsCount, mediaCount, groupsCount, isLoading } = useProfileStatsCount(userId);
  
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-2 gap-2", className)}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-2", className)}>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatCount(postsCount)}</span>
        <span> {translate('profileStats.posts', 'Posts')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(mediaCount)}</span>
        <span> {translate('profileStats.media', 'Media')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(groupsCount)}</span>
        <span> {translate('profileStats.groups', 'Groups')}</span>
      </p>
    </div>
  );
}
