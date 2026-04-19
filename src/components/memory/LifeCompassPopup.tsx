import { useMemo, useState } from "react";
import { Target, TrendingUp, Heart, DollarSign, Briefcase, GraduationCap, Sparkles, X, Infinity as InfinityIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLifeCompass } from "@/hooks/useLifeCompass";
import { cn } from "@/lib/utils";

interface LifeCompassPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_GOALS = [
  {
    category: "wealth",
    icon: DollarSign,
    title: "Build Financial Freedom",
    description: "Achieve financial independence and wealth",
    gradient: "from-yellow-500/20 to-amber-500/20",
  },
  {
    category: "relationship",
    icon: Heart,
    title: "Find Life Partner",
    description: "Build meaningful romantic relationships",
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    category: "health",
    icon: TrendingUp,
    title: "Transform Health",
    description: "Achieve optimal physical and mental wellness",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    category: "career",
    icon: Briefcase,
    title: "Advance Career",
    description: "Build a fulfilling and successful career",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    category: "learning",
    icon: GraduationCap,
    title: "Master New Skills",
    description: "Learn and grow through knowledge",
    gradient: "from-purple-500/20 to-indigo-500/20",
  },
  {
    category: "spiritual",
    icon: Sparkles,
    title: "Spiritual Life",
    description: "Deepen purpose, presence, and inner peace",
    gradient: "from-violet-500/20 to-fuchsia-500/20",
  },
  {
    // System-seeded default goal — keep it available so users can swap back
    // to the longevity focus at any time after choosing a different primary.
    category: "longevity",
    icon: InfinityIcon,
    title: "Improve quality of life and extend lifespan",
    description: "Focus on healthspan, energy, and longevity — Vitanaland's mission",
    gradient: "from-sky-500/20 to-teal-500/20",
  },
];

// Whether a suggested goal is the same one that's currently active on the
// user's compass. We match on both title and category (case-insensitive,
// trimmed) so a suggestion selected from the list always matches what's stored.
function isActiveGoal(
  goal: { title: string; category: string },
  compass: { primary_goal: string; category: string } | null | undefined,
): boolean {
  if (!compass) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  return (
    norm(compass.primary_goal) === norm(goal.title) ||
    norm(compass.category) === norm(goal.category)
  );
}

export function LifeCompassPopup({ open, onOpenChange }: LifeCompassPopupProps) {
  const { compass, updateCompass, isUpdating } = useLifeCompass();
  const [customGoal, setCustomGoal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Hide the currently active goal from the suggestion list — one goal
  // replaces the other, so showing it again as a pickable card is wrong.
  // The list still contains every alternative (including the previously
  // active one the user just swapped away from), so switching back is
  // always one tap away.
  const visibleGoals = useMemo(
    () => SUGGESTED_GOALS.filter((g) => !isActiveGoal(g, compass)),
    [compass],
  );

  const handleSuggestedGoal = (goal: typeof SUGGESTED_GOALS[0]) => {
    updateCompass({
      primary_goal: goal.title,
      category: goal.category,
    });
    onOpenChange(false);
  };

  const handleCustomGoal = () => {
    if (!customGoal.trim() || !selectedCategory) return;

    updateCompass({
      primary_goal: customGoal.trim(),
      category: selectedCategory,
    });
    setCustomGoal("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-lg"
      >
        {/* Explicit close button — always visible top-right, outside the scroll
            area. The framework's default Close is hidden by [&>button]:sr-only
            on DialogContent, so render our own with a clear target and z-index. */}
        <DialogClose
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-muted/80 hover:bg-muted text-foreground opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          <X className="h-4 w-4" />
        </DialogClose>

        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <DialogTitle className="text-xl sm:text-2xl break-words">Life Compass</DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
            Your Life Compass guides all AI recommendations and decisions. Choose a primary goal
            that matters most to you right now. The AI will prioritize suggestions that align
            with this direction.
          </DialogDescription>
        </DialogHeader>

        {compass && (
          <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Current Compass</p>
            <p className="text-base sm:text-lg font-semibold break-words">{compass.primary_goal}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
              <span>Alignment: {compass.alignment_score}%</span>
              <span className="hidden sm:inline">•</span>
              <span>Confidence: {compass.confidence_score}%</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Suggested Goals
            </h3>
            <div className="grid gap-2.5 sm:gap-3">
              {visibleGoals.map((goal) => {
                const Icon = goal.icon;
                return (
                  <button
                    key={goal.category}
                    onClick={() => handleSuggestedGoal(goal)}
                    disabled={isUpdating}
                    className={cn(
                      "flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 text-left transition-all w-full min-w-0",
                      "hover:border-primary hover:shadow-md",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      `bg-gradient-to-r ${goal.gradient}`
                    )}
                  >
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base break-words">{goal.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">{goal.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Custom Goal
            </h3>
            <Textarea
              placeholder="Describe your primary goal in your own words..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              className="min-h-20 sm:min-h-24 mb-3 text-sm sm:text-base"
            />
            <div className="flex flex-wrap gap-2 mb-3">
              {visibleGoals.map((goal) => (
                <button
                  key={goal.category}
                  onClick={() => setSelectedCategory(goal.category)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs sm:text-sm border-2 transition-colors",
                    selectedCategory === goal.category
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {goal.category}
                </button>
              ))}
            </div>
            <Button
              onClick={handleCustomGoal}
              disabled={!customGoal.trim() || !selectedCategory || isUpdating}
              className="w-full"
            >
              Set Custom Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
