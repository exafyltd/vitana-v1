import { UserProfile } from "@/types/profile";
import { useFollow } from "@/hooks/useFollow";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileStatsProps {
  profile: UserProfile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const profileUserId = profile.user_id || profile.id;
  const { followersCount, followingCount } = useFollow(profile.id);
  const { translate } = useTranslation();
  const { postsCount, mediaCount, groupsCount, isLoading } = useProfileStatsCount(profileUserId);
  
  return (
    <div className="flex items-center justify-center gap-8 md:gap-12 pt-2 pb-6 border-y border-border/50">
      <div className="text-center">
        {isLoading ? (
          <Skeleton className="h-8 w-10 mx-auto mb-1" />
        ) : (
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {postsCount.toLocaleString()}
          </div>
        )}
        <div className="text-sm text-muted-foreground">{translate('profileStats.posts', 'Posts')}</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {followersCount.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">{translate('profileStats.followers', 'Followers')}</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {followingCount.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">{translate('profileStats.following', 'Following')}</div>
      </div>
      <div className="text-center">
        {isLoading ? (
          <Skeleton className="h-8 w-10 mx-auto mb-1" />
        ) : (
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {mediaCount.toLocaleString()}
          </div>
        )}
        <div className="text-sm text-muted-foreground">{translate('profileStats.media', 'Media')}</div>
      </div>
      <div className="text-center">
        {isLoading ? (
          <Skeleton className="h-8 w-10 mx-auto mb-1" />
        ) : (
          <div className="text-2xl md:text-3xl font-bold text-foreground">
            {groupsCount.toLocaleString()}
          </div>
        )}
        <div className="text-sm text-muted-foreground">{translate('profileStats.groups', 'Groups')}</div>
      </div>
    </div>
  );
}
