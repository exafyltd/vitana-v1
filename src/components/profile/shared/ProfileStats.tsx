import { UserProfile } from "@/types/profile";
import { useFollow } from "@/hooks/useFollow";

interface ProfileStatsProps {
  profile: UserProfile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const { followersCount, followingCount } = useFollow(profile.id);
  
  return (
    <div className="flex items-center justify-center gap-8 md:gap-12 pt-2 pb-6 border-y border-border/50">
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {profile.stats.posts.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Posts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {followersCount.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Followers</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {followingCount.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Following</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {profile.stats.mediaUploads.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Media</div>
      </div>
      <div className="text-center">
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          {profile.stats.groupsJoined.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Groups</div>
      </div>
    </div>
  );
}