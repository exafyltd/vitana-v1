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

const milestoneMap: Record<string, { icon: string; reward: number }> = {
  profile_complete: { icon: "✨", reward: 20 },
  first_diary: { icon: "📖", reward: 15 },
  first_connection: { icon: "🤝", reward: 20 },
  five_connections: { icon: "🌱", reward: 30 },
  first_group: { icon: "👥", reward: 15 },
  first_event_rsvp: { icon: "📅", reward: 15 },
  first_match_accepted: { icon: "💫", reward: 20 },
  diary_streak_3: { icon: "🔥", reward: 20 },
  diary_streak_7: { icon: "⭐", reward: 50 },
  diary_streak_30: { icon: "🏆", reward: 100 },
  first_health_check: { icon: "💚", reward: 25 },
  first_referral: { icon: "🎯", reward: 0 },
  onboarding_complete: { icon: "🎉", reward: 50 },
};

interface MilestoneDetail {
  milestone: string;
  title: string;
  body: string;
  url: string;
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

  const mapping = milestoneMap[detail.milestone] ?? { icon: "🏅", reward: 0 };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="text-6xl mb-2">{mapping.icon}</div>
          <DialogTitle className="text-xl">{detail.title}</DialogTitle>
          <DialogDescription className="mt-2">{detail.body}</DialogDescription>
        </DialogHeader>
        {mapping.reward > 0 && (
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 my-4">
            +{mapping.reward} VTN!
          </p>
        )}
        <Button
          className="w-full"
          onClick={() => {
            setOpen(false);
            if (detail.url) navigate(detail.url);
          }}
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
