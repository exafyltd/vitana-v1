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

  const stats = [
    { value: postsCount, label: translate('profileStats.posts', 'Posts') },
    { value: followersCount, label: translate('profileStats.followers', 'Followers') },
    { value: followingCount, label: translate('profileStats.following', 'Following') },
    { value: mediaCount, label: translate('profileStats.media', 'Media') },
    { value: groupsCount, label: translate('profileStats.groups', 'Groups') },
  ];

  return (
    <div className={cn("grid grid-cols-5 gap-1 py-3 px-2", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center gap-0.5">
          <span className="text-base font-semibold text-foreground">{formatCount(stat.value)}</span>
          <span className="text-[10px] text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
