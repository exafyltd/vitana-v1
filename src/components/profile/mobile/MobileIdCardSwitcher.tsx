import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MobileIdentityCard } from "./MobileIdentityCard";
import { MobileIdCardBack } from "./MobileIdCardBack";
import { UserProfile } from "@/types/profile";

type CardSide = "front" | "back";

interface MobileIdCardSwitcherProps {
  profile: UserProfile;
  editMode?: boolean;
  isOwner?: boolean;
  onEditIdentity?: () => void;
  onEditSocial?: () => void;
  onRefreshProfile?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  className?: string;
}

export function MobileIdCardSwitcher({
  profile,
  editMode = false,
  isOwner = true,
  onEditIdentity,
  onEditSocial,
  onRefreshProfile,
  onShare,
  onFollow,
  onMessage,
  isFollowing = false,
  followLoading = false,
  className
}: MobileIdCardSwitcherProps) {
  const [activeSide, setActiveSide] = useState<CardSide>("front");

  return (
    <div className={cn("", className)}>
      {/* Segmented Control - Centered above the card */}
      <div className="flex justify-center px-4 pt-safe-top pb-3">
        <div 
          className="relative flex p-1 rounded-full border border-white/10"
          style={{
            background: "linear-gradient(135deg, hsl(216, 53%, 8%) 0%, hsl(222, 47%, 11%) 100%)",
            boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)"
          }}
        >
          {/* Sliding indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, hsl(199, 36%, 45%) 0%, hsl(239, 36%, 55%) 100%)",
              boxShadow: "0 2px 8px rgba(14, 165, 233, 0.3)"
            }}
            initial={false}
            animate={{
              left: activeSide === "front" ? "4px" : "50%",
              width: "calc(50% - 4px)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          
          {/* Front button */}
          <button
            onClick={() => setActiveSide("front")}
            className={cn(
              "relative z-10 px-6 py-2 text-xs font-semibold tracking-wide transition-colors duration-200",
              activeSide === "front" 
                ? "text-white" 
                : "text-white/50 hover:text-white/70"
            )}
          >
            Identity
          </button>
          
          {/* Back button */}
          <button
            onClick={() => setActiveSide("back")}
            className={cn(
              "relative z-10 px-6 py-2 text-xs font-semibold tracking-wide transition-colors duration-200",
              activeSide === "back" 
                ? "text-white" 
                : "text-white/50 hover:text-white/70"
            )}
          >
            Social
          </button>
        </div>
      </div>

      {/* Card Container with Animation */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeSide === "front" ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <MobileIdentityCard
                avatarUrl={profile.avatarUrl}
                avatarOffsetX={profile.avatarOffsetX}
                avatarOffsetY={profile.avatarOffsetY}
                displayName={profile.name}
                handle={profile.handle}
                archetype={profile.longevityArchetype}
                vitanaIndex={profile.vitanaIndex}
                vitanaPercentile={profile.vitanaPercentile}
                editMode={editMode}
                isOwner={isOwner}
                onEdit={onEditIdentity}
                onShare={onShare}
                onFollow={onFollow}
                onMessage={onMessage}
                isFollowing={isFollowing}
                followLoading={followLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
            <MobileIdCardBack
              profile={profile}
              editMode={editMode}
              onEdit={onEditSocial}
              onRefreshProfile={onRefreshProfile}
            />
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
