import { useState } from "react";
import { Image, MessageSquare, UserCheck, Users, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { VCard } from "@/components/ui/vcard";
import { IconThumb } from "@/components/spotlight/tier-b/TierBKit";
import { cardButtonProps } from "@/components/spotlight/tier-b/cardButtonProps";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
import { GroupListDialog } from "@/components/profile/GroupListDialog";
import { useFollow } from "@/hooks/useFollow";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { useTranslation } from "@/hooks/useTranslation";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { fmtNumber } from "@/lib/locale-format";
import type { UserProfile } from "@/types/profile";

interface ProfileSpotlightRailProps {
  profile: UserProfile;
  profileUserId?: string;
  followersCount?: number;
  followingCount?: number;
}

/**
 * desktop-spotlight-finish / public-profile — the context rail of the profile
 * `detail` screen (`/u/:identifier`, `/me/profile`) on desktop Spotlight.
 * The flag-off stats strip (ProfileStats) as compact VCards: the same five
 * counts, the same labels and the same follower / following / group lists.
 * Phones and flag-off desktop never render it.
 */
export function ProfileSpotlightRail({
  profile,
  profileUserId: propUserId,
  followersCount: propFollowers,
  followingCount: propFollowing,
}: ProfileSpotlightRailProps) {
  const profileUserId = resolveProfileUserId(propUserId, profile.user_id, profile.id);
  const { followersCount: hookFollowers, followingCount: hookFollowing } = useFollow(profileUserId);
  const followersCount = propFollowers ?? hookFollowers;
  const followingCount = propFollowing ?? hookFollowing;
  const { postsCount, mediaCount, groupsCount, isPending } = useProfileStatsCount(profileUserId);
  const { translate } = useTranslation();
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const count = (n: number, pending = false) => (pending ? "…" : fmtNumber(n));
  const card = (key: string, icon: LucideIcon, label: string, value: string, onOpen?: () => void) => (
    <VCard
      key={key}
      as="div"
      size="compact"
      data-profile-stat={key}
      mediaSlot={<IconThumb icon={icon} />}
      eyebrow={label}
      title={value}
      {...(onOpen ? cardButtonProps(onOpen, `${label}: ${value}`) : {})}
    />
  );

  return (
    <div className="flex flex-col gap-3" data-testid="profile-spotlight-rail">
      {card("posts", MessageSquare, translate("profileStats.posts", "Posts"), count(postsCount, isPending))}
      {card("followers", Users, translate("profileStats.followers", "Followers"), count(followersCount), () => setFollowList("followers"))}
      {card("following", UserCheck, translate("profileStats.following", "Following"), count(followingCount), () => setFollowList("following"))}
      {card("media", Image, translate("profileStats.media", "Media"), count(mediaCount, isPending))}
      {card("groups", UsersRound, translate("profileStats.groups", "Groups"), count(groupsCount, isPending), () => setGroupsOpen(true))}

      <FollowListDialog
        open={followList !== null}
        onOpenChange={(open) => {
          if (!open) setFollowList(null);
        }}
        userId={profileUserId}
        type={followList || "followers"}
      />
      <GroupListDialog open={groupsOpen} onOpenChange={setGroupsOpen} userId={profileUserId} />
    </div>
  );
}
