import { useState } from "react";
import { UserProfile } from "@/types/profile";
import { useFollow } from "@/hooks/useFollow";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupListDialog } from "@/components/profile/GroupListDialog";
import { FollowListDialog } from "@/components/profile/FollowListDialog";

interface ProfileStatsProps {
  profile: UserProfile;
  profileUserId?: string;
  followersCount?: number;
  followingCount?: number;
}

export function ProfileStats({ profile, profileUserId: propUserId, followersCount: propFollowers, followingCount: propFollowing }: ProfileStatsProps) {
  const profileUserId = resolveProfileUserId(propUserId, profile.user_id, profile.id);
  const { followersCount: hookFollowers, followingCount: hookFollowing } = useFollow(profileUserId);
  const followersCount = propFollowers ?? hookFollowers;
  const followingCount = propFollowing ?? hookFollowing;
  const { translate } = useTranslation();
  const { postsCount, mediaCount, groupsCount, isPending } = useProfileStatsCount(profileUserId);
  const [groupListOpen, setGroupListOpen] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  
  return (
    <>
      <div className="flex items-center justify-center gap-8 md:gap-12 pt-1 pb-2 border-y border-border/50">
        <div className="text-center">
          {isPending ? (
            <Skeleton className="h-8 w-10 mx-auto mb-1" />
          ) : (
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {postsCount.toLocaleString()}
            </div>
          )}
          <div className="text-sm text-muted-foreground">{translate('profileStats.posts', 'Posts')}</div>
        </div>
        <div
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setFollowListType("followers")}
        >
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {followersCount.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">{translate('profileStats.followers', 'Followers')}</div>
        </div>
        <div
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setFollowListType("following")}
        >
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {followingCount.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">{translate('profileStats.following', 'Following')}</div>
        </div>
        <div className="text-center">
          {isPending ? (
            <Skeleton className="h-8 w-10 mx-auto mb-1" />
          ) : (
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {mediaCount.toLocaleString()}
            </div>
          )}
          <div className="text-sm text-muted-foreground">{translate('profileStats.media', 'Media')}</div>
        </div>
        <div
          className="text-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setGroupListOpen(true)}
        >
          {isPending ? (
            <Skeleton className="h-8 w-10 mx-auto mb-1" />
          ) : (
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {groupsCount.toLocaleString()}
            </div>
          )}
          <div className="text-sm text-muted-foreground">{translate('profileStats.groups', 'Groups')}</div>
        </div>
      </div>

      <FollowListDialog
        open={followListType !== null}
        onOpenChange={(open) => { if (!open) setFollowListType(null); }}
        userId={profileUserId}
        type={followListType || "followers"}
      />

      <GroupListDialog
        open={groupListOpen}
        onOpenChange={setGroupListOpen}
        userId={profileUserId}
      />
    </>
  );
}
