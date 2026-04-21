import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileIdentityCard } from "./MobileIdentityCard";
import { MobileIdCardBack } from "./MobileIdCardBack";
import { MobileAccountCard } from "./MobileAccountCard";
import { UserProfile } from "@/types/profile";

type CardSide = "front" | "back" | "account";

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

const SEGMENTS: { id: CardSide; label: string }[] = [
  { id: "front", label: "Identity" },
  { id: "back", label: "Social" },
  { id: "account", label: "Account" },
];

// With p-1 (4px) padding on both sides, each of 3 equal segments spans
// (100% - 8px) / 3. Approx. to keep CSS readable.
const SEGMENT_POSITIONS: Record<CardSide, { left: string; width: string }> = {
  front:   { left: "4px",                      width: "calc(33.333% - 3px)" },
  back:    { left: "calc(33.333% + 1px)",      width: "calc(33.333% - 3px)" },
  account: { left: "calc(66.666% - 2px)",      width: "calc(33.333% - 3px)" },
};

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
  const [activeSide, setActiveSide] = useState<CardSide>("front");

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
      <div className="flex justify-center px-4 pt-5 pb-5">
        <div
          className="relative flex p-1 rounded-full border border-black/5 dark:border-white/10 w-full max-w-xs bg-white/70 dark:bg-white/5 backdrop-blur-sm"
          style={{
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)"
          }}
        >
          {/* Sliding indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(240, 70%, 90%) 0%, hsl(210, 70%, 88%) 100%)",
              boxShadow: "0 1px 3px rgba(99, 102, 241, 0.18)"
            }}
            initial={false}
            animate={SEGMENT_POSITIONS[activeSide]}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />

          {SEGMENTS.map((segment) => (
            <button
              key={segment.id}
              onClick={() => setActiveSide(segment.id)}
              aria-pressed={activeSide === segment.id}
              className={cn(
                "relative z-10 flex-1 py-2 text-xs font-semibold tracking-wide transition-colors duration-200",
                activeSide === segment.id
                  ? "text-foreground"
                  : "text-foreground/60 hover:text-foreground/80"
              )}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>

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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
