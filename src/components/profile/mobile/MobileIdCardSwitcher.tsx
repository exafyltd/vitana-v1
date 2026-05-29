import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileIdentityCard } from "./MobileIdentityCard";
import { MobileIdCardBack } from "./MobileIdCardBack";
import { MobileAccountCard } from "./MobileAccountCard";
import { MobileSubscriptionSummary } from "./MobileSubscriptionSummary";
import { ProfileIdSegmentedControl } from "../shared/ProfileIdSegmentedControl";
import { UserProfile } from "@/types/profile";

type CardSide = "front" | "back" | "account";
const VALID_SIDES: ReadonlySet<CardSide> = new Set(["front", "back", "account"]);

interface MobileIdCardSwitcherProps {
  profile: UserProfile;
  editMode?: boolean;
  isOwner?: boolean;
  onEditIdentity?: () => void;
  onEditSocial?: () => void;
  onEditAccount?: () => void;
  onRefreshProfile?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  className?: string;
}

const SEGMENTS: readonly { id: CardSide; label: string }[] = [
  { id: "front", label: "Identity" },
  { id: "back", label: "Social" },
  { id: "account", label: "Account" },
] as const;

export function MobileIdCardSwitcher({
  profile,
  editMode = false,
  isOwner = true,
  onEditIdentity,
  onEditSocial,
  onEditAccount,
  onRefreshProfile,
  onShare,
  onFollow,
  onMessage,
  isFollowing = false,
  followLoading = false,
  className
}: MobileIdCardSwitcherProps) {
  // Persist the active segment in the URL (?card=front|back|account) so
  // navigating away (e.g. into /profile/subscriptions) and back returns the
  // user to the segment they were on, instead of resetting to Identity.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("card");
  const activeSide: CardSide = param && VALID_SIDES.has(param as CardSide)
    ? (param as CardSide)
    : "front";

  const handleSegmentChange = useCallback(
    (next: CardSide) => {
      const params = new URLSearchParams(searchParams);
      if (next === "front") params.delete("card");
      else params.set("card", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const slotAnim = (direction: 1 | -1) => ({
    initial: { opacity: 0, x: 20 * direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 * direction },
  });

  return (
    <div className={cn("", className)}>
      {/* Segmented Control — soft, secondary treatment so the card below
          stays the hero. Extra top padding gives it room to breathe
          between the app bar and the card. */}
      <ProfileIdSegmentedControl<CardSide>
        segments={SEGMENTS}
        value={activeSide}
        onChange={handleSegmentChange}
        size="sm"
        className="px-4 pt-5 pb-5"
      />

      {/* Card Container with Animation */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeSide === "front" && (
            <motion.div key="front" {...slotAnim(-1)} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <MobileIdentityCard
                avatarUrl={profile.avatarUrl}
                avatarOffsetX={profile.avatarOffsetX}
                avatarOffsetY={profile.avatarOffsetY}
                displayName={profile.name}
                handle={profile.handle}
                archetype={profile.longevityArchetype}
                vitanaIndex={profile.vitanaIndex}
                vitanaPercentile={profile.vitanaPercentile}
                isOwner={isOwner}
                onShare={onShare}
                onFollow={onFollow}
                onMessage={onMessage}
                isFollowing={isFollowing}
                followLoading={followLoading}
              />
            </motion.div>
          )}
          {activeSide === "back" && (
            <motion.div key="back" {...slotAnim(1)} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <MobileIdCardBack
                profile={profile}
                editMode={editMode}
                onEdit={onEditSocial}
                onRefreshProfile={onRefreshProfile}
              />
            </motion.div>
          )}
          {activeSide === "account" && (
            <motion.div key="account" {...slotAnim(1)} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <MobileAccountCard
                profile={profile}
                isOwner={isOwner}
                editMode={editMode}
                onEdit={onEditAccount}
              />
              {/* Subscription storefront entry — only on the owner's own Account view */}
              {isOwner && (
                <div className="mt-3">
                  <MobileSubscriptionSummary />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
