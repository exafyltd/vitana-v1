import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupListDialog } from "@/components/profile/GroupListDialog";

interface MobileProfileStatsProps {
  userId?: string;
  profileId?: string;
  className?: string;
}

// Followers/Following moved into the identity card (MobileIdentityCard),
// so this strip only carries the content stats now.
export function MobileProfileStats({
  userId,
  profileId,
  className
}: MobileProfileStatsProps) {
  const { translate } = useTranslation();
  const resolvedUserId = resolveProfileUserId(userId, profileId);
  const { postsCount, mediaCount, groupsCount, isPending } = useProfileStatsCount(resolvedUserId);

  const [groupListOpen, setGroupListOpen] = useState(false);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const targetId = profileId || userId || "";

  const stats = [
    { key: "posts", value: postsCount, label: translate('profileStats.posts', 'Posts'), clickable: false },
    { key: "media", value: mediaCount, label: translate('profileStats.media', 'Media'), clickable: false },
    { key: "groups", value: groupsCount, label: translate('profileStats.groups', 'Groups'), clickable: true },
  ];

  return (
    <>
      <div className={cn("grid grid-cols-3 gap-1 py-3 px-2", className)}>
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={cn(
              "flex flex-col items-center gap-0.5",
              stat.clickable && "cursor-pointer active:opacity-70"
            )}
            onClick={() => {
              if (stat.key === "groups") setGroupListOpen(true);
            }}
          >
            {isPending ? (
              <Skeleton className="h-5 w-8 mb-0.5" />
            ) : (
              <span className="text-base font-semibold text-foreground">{formatCount(stat.value)}</span>
            )}
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {targetId && (
        <GroupListDialog
          open={groupListOpen}
          onOpenChange={setGroupListOpen}
          userId={targetId}
        />
      )}
    </>
  );
}
