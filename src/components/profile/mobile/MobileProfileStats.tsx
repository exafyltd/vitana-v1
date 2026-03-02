import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { useFollow } from "@/hooks/useFollow";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowListDialog } from "@/components/profile/FollowListDialog";

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
  
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  
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

  const targetId = profileId || userId || "";

  const stats = [
    { key: "posts", value: postsCount, label: translate('profileStats.posts', 'Posts'), clickable: false },
    { key: "followers", value: followersCount, label: translate('profileStats.followers', 'Followers'), clickable: true },
    { key: "following", value: followingCount, label: translate('profileStats.following', 'Following'), clickable: true },
    { key: "media", value: mediaCount, label: translate('profileStats.media', 'Media'), clickable: false },
    { key: "groups", value: groupsCount, label: translate('profileStats.groups', 'Groups'), clickable: false },
  ];

  return (
    <>
      <div className={cn("grid grid-cols-5 gap-1 py-3 px-2", className)}>
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={cn(
              "flex flex-col items-center gap-0.5",
              stat.clickable && "cursor-pointer active:opacity-70"
            )}
            onClick={() => {
              if (stat.key === "followers") setFollowListType("followers");
              if (stat.key === "following") setFollowListType("following");
            }}
          >
            <span className="text-base font-semibold text-foreground">{formatCount(stat.value)}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {targetId && (
        <FollowListDialog
          open={followListType !== null}
          onOpenChange={(open) => { if (!open) setFollowListType(null); }}
          userId={targetId}
          type={followListType || "followers"}
        />
      )}
    </>
  );
}
