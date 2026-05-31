import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n-toast";
import { useAuth } from "@/context/AuthProvider";
import { useFollow } from "@/hooks/useFollow";
import { isValidUUID } from "@/lib/resolveProfileUserId";

interface FollowButtonProps {
  /** The user to (potentially) follow — e.g. an event host, room creator, match. */
  targetUserId: string | undefined | null;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  /** Icon only, no "Folgen" label (for tight card corners). */
  iconOnly?: boolean;
}

/**
 * Single source of truth for the "Follow" call-to-action across every card and
 * detail surface — live rooms, events, meetups, matches, products, etc.
 *
 * Behaviour, by design (do not special-case per screen):
 *   • Shows a **Follow** CTA only when the viewer does NOT already follow the
 *     target. The moment they follow (or if they already did), the button
 *     removes itself. There is deliberately no unfollow here — you should never
 *     unfollow someone just because you opened their event/room/card.
 *   • Renders nothing for your own id, a missing/invalid id, or while the
 *     follow status is still loading (prevents a Follow→disappear flicker).
 *
 * Unfollowing still lives where it belongs: the person's profile page.
 */
export function FollowButton({
  targetUserId,
  className,
  size = "sm",
  variant = "outline",
  iconOnly = false,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { isFollowing, statusLoading, followUser, loading } = useFollow(targetUserId ?? undefined);

  const isSelf = !!targetUserId && targetUserId === user?.id;

  // Hide whenever following is impossible, unresolved, or already true.
  // `useFollow` normalizes a non-UUID target (demo id / handle) to undefined,
  // so a truthy-but-invalid id must not render a clickable CTA — gate on a real
  // UUID, matching the hook's own validation.
  if (!isValidUUID(targetUserId ?? undefined) || isSelf || statusLoading || isFollowing) return null;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={loading}
      onClick={(e) => {
        // Cards are often clickable; don't let "Follow" open the card.
        e.stopPropagation();
        void followUser();
      }}
      className={className}
      aria-label={t("common.follow")}
    >
      <UserPlus className={cn("h-4 w-4", !iconOnly && "mr-1.5")} />
      {!iconOnly && t("common.follow")}
    </Button>
  );
}

export default FollowButton;
