import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { useFollow } from "@/hooks/useFollow";
import { Skeleton } from "@/components/ui/skeleton";

interface MobileProfileStatsProps {
  userId?: string;
  profileId?: string;
  followersCount?: number;
  followingCount?: number;
  className?: string;
}

export function MobileProfileStats({
  userId,
  profileId,
  followersCount: propFollowers,
  followingCount: propFollowing,
  className
}: MobileProfileStatsProps) {
  const { translate } = useTranslation();
  const { postsCount, mediaCount, groupsCount, isLoading } = useProfileStatsCount(userId);
  const { followersCount: hookFollowers, followingCount: hookFollowing } = useFollow(profileId || userId);
  const followersCount = propFollowers ?? hookFollowers;
  const followingCount = propFollowing ?? hookFollowing;
  
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-2 gap-2", className)}>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-2", className)}>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatCount(postsCount)}</span>
        <span> {translate('profileStats.posts', 'Posts')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(followersCount)}</span>
        <span> {translate('profileStats.followers', 'Followers')}</span>
        <span className="mx-1.5">·</span>
        <span className="font-medium text-foreground">{formatCount(followingCount)}</span>
        <span> {translate('profileStats.following', 'Following')}</span>
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
