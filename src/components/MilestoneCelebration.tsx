import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

type RewardKind = "vtn" | "index-tier" | "none";

interface MilestoneMapEntry {
  icon: string;
  reward: number;
  rewardKind: RewardKind;
  /** Show "Invite a friend" footer for celebratory milestones. */
  inviteCta?: boolean;
}

const milestoneMap: Record<string, MilestoneMapEntry> = {
  profile_complete:    { icon: "✨", reward: 20,  rewardKind: "vtn" },
  first_diary:         { icon: "📖", reward: 15,  rewardKind: "vtn" },
  first_connection:    { icon: "🤝", reward: 20,  rewardKind: "vtn" },
  five_connections:    { icon: "🌱", reward: 30,  rewardKind: "vtn" },
  first_group:         { icon: "👥", reward: 15,  rewardKind: "vtn" },
  first_event_rsvp:    { icon: "📅", reward: 15,  rewardKind: "vtn" },
  first_match_accepted:{ icon: "💫", reward: 20,  rewardKind: "vtn" },
  diary_streak_3:      { icon: "🔥", reward: 20,  rewardKind: "vtn" },
  diary_streak_7:      { icon: "⭐", reward: 50,  rewardKind: "vtn" },
  diary_streak_30:     { icon: "🏆", reward: 100, rewardKind: "vtn" },
  first_health_check:  { icon: "💚", reward: 25,  rewardKind: "vtn" },
  first_referral:      { icon: "🎯", reward: 0,   rewardKind: "none" },
  onboarding_complete: { icon: "🎉", reward: 50,  rewardKind: "vtn" },

  // Vitana Index Phase 2 — streaks, tier-up, pillar thresholds
  streak_3:   { icon: "🔥", reward: 0, rewardKind: "none" },
  streak_7:   { icon: "🌱", reward: 0, rewardKind: "none", inviteCta: true },
  streak_14:  { icon: "🏆", reward: 0, rewardKind: "none", inviteCta: true },
  streak_30:  { icon: "🌟", reward: 0, rewardKind: "none", inviteCta: true },

  // Tier-ups — keys are derived from tier label (lowercased, spaces→underscores)
  index_tier_up_starting:    { icon: "🌱", reward: 0, rewardKind: "index-tier" },
  index_tier_up_early:       { icon: "🌿", reward: 0, rewardKind: "index-tier" },
  index_tier_up_building:    { icon: "🌾", reward: 0, rewardKind: "index-tier" },
  index_tier_up_strong:      { icon: "💪", reward: 0, rewardKind: "index-tier", inviteCta: true },
  "index_tier_up_really_good": { icon: "🎯", reward: 0, rewardKind: "index-tier", inviteCta: true },
  index_tier_up_elite:       { icon: "👑", reward: 0, rewardKind: "index-tier", inviteCta: true },
};

interface MilestoneDetail {
  milestone: string;
  title: string;
  body: string;
  url?: string;
  /** For tier-ups, the new Index value rendered in the reward slot. */
  rewardValue?: string;
}

export default function MilestoneCelebration() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MilestoneDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<MilestoneDetail>).detail;
      setDetail(d);
      setOpen(true);
    };
    window.addEventListener("vitana-milestone", handler);
    return () => window.removeEventListener("vitana-milestone", handler);
  }, []);

  if (!detail) return null;

  const mapping: MilestoneMapEntry =
    milestoneMap[detail.milestone] ?? { icon: "🏅", reward: 0, rewardKind: "none" };

  const handleInvite = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("referral:open"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="text-6xl mb-2">{mapping.icon}</div>
          <DialogTitle className="text-xl">{detail.title}</DialogTitle>
          <DialogDescription className="mt-2">{detail.body}</DialogDescription>
        </DialogHeader>

        {mapping.rewardKind === "vtn" && mapping.reward > 0 && (
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 my-4">{t('screens.common.rewardVtn', { reward: mapping.reward })}
          </p>
        )}
        {mapping.rewardKind === "index-tier" && detail.rewardValue && (
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 my-4">
            {detail.rewardValue}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => {
              setOpen(false);
              if (detail.url) navigate(detail.url);
            }}
          >
            {t('screens.common.continue')}
          </Button>
          {mapping.inviteCta && (
            <Button variant="outline" className="w-full" onClick={handleInvite}>
              {t('screens.common.inviteFriendCelebrate')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
