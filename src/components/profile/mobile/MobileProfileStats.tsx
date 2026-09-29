import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useProfileStatsCount } from "@/hooks/useProfileStatsCount";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupListDialog } from "@/components/profile/GroupListDialog";

interface MobileProfileStatsProps {
  userId?: string;
  profileId?: string;
  /** "divided" = equal columns with hairline separators, used inside the
   *  profile's Vitana Index card (VTID-04470). */
  variant?: "strip" | "divided";
  className?: string;
  /** Optional size overrides (VTID-04526: the Index card scales with the
   *  space it has). Unset = the variant's default sizes. */
  valueStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  rowStyle?: CSSProperties;
}

// Followers/Following moved into the identity card (MobileIdentityCard),
// so this strip only carries the content stats now.
export function MobileProfileStats({
  userId,
  profileId,
  variant = "strip",
  className,
  valueStyle,
  labelStyle,
  rowStyle,
}: MobileProfileStatsProps) {
  const divided = variant === "divided";
  const { translate } = useTranslation();
  const resolvedUserId = resolveProfileUserId(userId, profileId);
  const { postsCount, mediaCount, groupsCount, isPending } = useProfileStatsCount(resolvedUserId);

  const [groupListOpen, setGroupListOpen] = useState(false);

  const formatCount = (count: number) => {
    if (!Number.isFinite(count)) return "0";
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
      <div
        className={cn(
          "grid grid-cols-3",
          divided ? "divide-x divide-slate-200 py-2.5 rtl:divide-x-reverse" : "gap-1 py-3 px-2",
          className,
        )}
        style={rowStyle}
      >
        {stats.map((stat) => {
          const body = (
            <>
              {isPending ? (
                <Skeleton className="h-5 w-8 mb-0.5" />
              ) : (
                <span className={cn("font-semibold text-foreground", divided ? "text-lg leading-tight" : "text-base")} style={valueStyle}>
                  {formatCount(stat.value ?? 0)}
                </span>
              )}
              <span className={cn("text-muted-foreground", divided ? "text-xs" : "text-[10px]")} style={labelStyle}>{stat.label}</span>
            </>
          );
          const cellClass = "flex min-w-0 flex-col items-center gap-0.5";
          return stat.clickable ? (
            <button
              key={stat.key}
              type="button"
              className={cn(cellClass, "cursor-pointer active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400", !divided && "rounded-md")}
              onClick={() => {
                if (stat.key === "groups") setGroupListOpen(true);
              }}
            >
              {body}
            </button>
          ) : (
            <div key={stat.key} className={cellClass}>
              {body}
            </div>
          );
        })}
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
