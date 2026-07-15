import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileIdentityCard } from "./MobileIdentityCard";
import { MobileIdCardBack } from "./MobileIdCardBack";
import { MobileAccountCard } from "./MobileAccountCard";
import { MobileBusinessCard } from "./MobileBusinessCard";
import { MobileSubscriptionSummary } from "./MobileSubscriptionSummary";
import { ProfileIdSegmentedControl } from "../shared/ProfileIdSegmentedControl";
import { UserProfile } from "@/types/profile";
import { useTranslation } from "@/hooks/useTranslation";

export type CardSide = "front" | "back" | "account" | "business";
const VALID_SIDES: ReadonlySet<CardSide> = new Set(["front", "back", "account", "business"]);

/**
 * Shared with parent pages (EditProfilePage.tsx, ProfileLayout.tsx) so they
 * can independently derive which segment is active — from the same ?card=
 * URL param this component itself reads — to gate the unrelated
 * Posts/About/Media/Groups tab system below them (VTID-02950 round 2: that
 * system must not render under the Business segment).
 */
export function getActiveCardSide(searchParams: URLSearchParams): CardSide {
  const param = searchParams.get("card");
  return param && VALID_SIDES.has(param as CardSide) ? (param as CardSide) : "front";
}

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
  followersCount?: number;
  followingCount?: number;
  className?: string;
}

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
  followersCount,
  followingCount,
  className
}: MobileIdCardSwitcherProps) {
  // Resolved at render so the labels follow the user's chosen language.
  const { translate } = useTranslation();
  // Business (Recommend & Earn stats, VTID-02950) is owner-only.
  const segments: readonly { id: CardSide; label: string }[] = [
    { id: "front", label: translate('profile.tabs.identity', 'Identity') },
    { id: "back", label: translate('profile.tabs.social', 'Social') },
    { id: "account", label: translate('profile.tabs.account', 'Account') },
    ...(isOwner ? [{ id: "business" as const, label: translate('profile.tabs.business', 'Business') }] : []),
  ];
  // Persist the active segment in the URL (?card=front|back|account) so
  // navigating away (e.g. into /profile/subscriptions) and back returns the
  // user to the segment they were on, instead of resetting to Identity.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSide = getActiveCardSide(searchParams);

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
        segments={segments}
        value={activeSide}
        onChange={handleSegmentChange}
        size="sm"
        accent="mint"
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
                userId={profile.user_id}
                profileId={profile.id}
                followersCount={followersCount}
                followingCount={followingCount}
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
          {activeSide === "business" && isOwner && (
            <motion.div key="business" {...slotAnim(1)} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <MobileBusinessCard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
