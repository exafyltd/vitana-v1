import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { useAuth } from "@/context/AuthProvider";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { ProfileIdCardFront } from "../shared/ProfileIdCardFront";
import { ProfileIdCardBack } from "../shared/ProfileIdCardBack";
import { ProfileIdSegmentedControl } from "../shared/ProfileIdSegmentedControl";
import { DesktopAccountCard } from "./DesktopAccountCard";

type DesktopCardSide = "identity" | "social" | "account";

interface DesktopIdCardSwitcherProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwner?: boolean;
  onEditIdentity?: () => void;
  onEditSocial?: () => void;
  onEditAccount?: () => void;
  className?: string;
}

const SEGMENTS: readonly { id: DesktopCardSide; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "social", label: "Social" },
  { id: "account", label: "Account" },
] as const;

export function DesktopIdCardSwitcher({
  profile,
  scope,
  editMode = false,
  isOwner = false,
  onEditIdentity,
  onEditSocial,
  onEditAccount,
  className,
}: DesktopIdCardSwitcherProps) {
  const [activeSide, setActiveSide] = useState<DesktopCardSide>("identity");
  const { user } = useAuth();
  const targetUserId = scope === "owner" ? user?.id : profile.id;
  const { themeConfig, cycleTheme } = useProfileTheme(targetUserId);

  const slotAnim = (direction: 1 | -1) => ({
    initial: { opacity: 0, x: 24 * direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 * direction },
  });

  return (
    <div className={cn("relative pt-8 pb-6", className)}>
      <div className="container mx-auto px-6">
        <ProfileIdSegmentedControl<DesktopCardSide>
          segments={SEGMENTS}
          value={activeSide}
          onChange={setActiveSide}
          size="md"
          className="mb-8"
        />

        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            {activeSide === "identity" && (
              <motion.div
                key="identity"
                {...slotAnim(-1)}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ProfileIdCardFront
                  profile={profile}
                  scope={scope}
                  editMode={editMode}
                  onEdit={onEditIdentity}
                  themeConfig={themeConfig}
                  cycleTheme={cycleTheme}
                />
              </motion.div>
            )}
            {activeSide === "social" && (
              <motion.div
                key="social"
                {...slotAnim(1)}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ProfileIdCardBack profile={profile} themeConfig={themeConfig} />
              </motion.div>
            )}
            {activeSide === "account" && (
              <motion.div
                key="account"
                {...slotAnim(1)}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <DesktopAccountCard
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
    </div>
  );
}
