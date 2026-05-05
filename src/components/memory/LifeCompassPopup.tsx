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
import { useTranslation } from "@/hooks/useTranslation";
import { applyReplacements } from "@/lib/i18n-helpers";
import { cn } from "@/lib/utils";

interface LifeCompassPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Canonical English titles double as the persisted DB value for suggested
// goals — that's what makes "Current Compass" re-localizable after a language
// switch (we match the stored title against the canonical one to decide
// whether to render the translated label or fall through verbatim for a
// user-typed custom goal). It also matches the legacy data already in DB.
const SUGGESTED_GOALS = [
  {
    category: "wealth",
    canonicalTitle: "Build Financial Freedom",
    icon: DollarSign,
    gradient: "from-yellow-500/20 to-amber-500/20",
  },
  {
    category: "relationship",
    canonicalTitle: "Find Life Partner",
    icon: Heart,
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    category: "health",
    canonicalTitle: "Transform Health",
    icon: TrendingUp,
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    category: "career",
    canonicalTitle: "Advance Career",
    icon: Briefcase,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    category: "learning",
    canonicalTitle: "Master New Skills",
    icon: GraduationCap,
    gradient: "from-purple-500/20 to-indigo-500/20",
  },
  {
    category: "spiritual",
    canonicalTitle: "Spiritual Life",
    icon: Sparkles,
    gradient: "from-violet-500/20 to-fuchsia-500/20",
  },
  {
    // System-seeded default goal — keep it available so users can swap back
    // to the longevity focus at any time after choosing a different primary.
    category: "longevity",
    canonicalTitle: "Improve quality of life and extend lifespan",
    icon: InfinityIcon,
    gradient: "from-sky-500/20 to-teal-500/20",
  },
];

// Whether a suggested goal is the same one that's currently active on the
// user's compass. We match on the category (case-insensitive, trimmed) since
// the localized title varies by language but the category is stable.
function isActiveGoal(
  goal: { category: string },
  compass: { primary_goal: string; category: string } | null | undefined,
): boolean {
  if (!compass) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  return norm(compass.category) === norm(goal.category);
}

export function LifeCompassPopup({ open, onOpenChange }: LifeCompassPopupProps) {
  const { compass, updateCompass, isUpdating } = useLifeCompass();
  const { translate } = useTranslation();
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
    // Persist the canonical (English) title, not the localized one — render
    // re-localizes via lifeCompass.goals.<category>.title so a user who picks
    // a goal in German still sees the English label after switching to EN.
    updateCompass({
      primary_goal: goal.canonicalTitle,
      category: goal.category,
    });
    onOpenChange(false);
  };

  // Resolve the visible "Current Compass" string. Suggested goals (those
  // whose stored primary_goal matches the canonical English title for the
  // saved category) are re-translated at render time. User-typed custom
  // goals are rendered verbatim — there's nothing to translate.
  const displayedPrimaryGoal = (() => {
    if (!compass) return "";
    const match = SUGGESTED_GOALS.find(
      (g) => g.category === compass.category && g.canonicalTitle === compass.primary_goal,
    );
    return match
      ? translate(`lifeCompass.goals.${match.category}.title`, match.canonicalTitle)
      : compass.primary_goal;
  })();

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
        {/* Standard unframed X close, top-right. Wrapped in a span so it isn't
            a direct <button> child of DialogContent — that's what the framework's
            [&>button]:sr-only selector hides (which is why the previous, direct
            DialogClose was invisible). boxShadow:'none' defeats the WebView/Radix
            auto-focus ring. */}
        <span className="absolute right-3 top-3 z-10">
          <DialogClose
            aria-label={translate('lifeCompass.closeAria', 'Close')}
            style={{ boxShadow: 'none' }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </span>

        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <DialogTitle className="text-xl sm:text-2xl break-words">
              {translate('lifeCompass.title', 'Life Compass')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
            {translate('lifeCompass.description')}
          </DialogDescription>
        </DialogHeader>

        {compass && (
          <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
              {translate('lifeCompass.currentCompass', 'Current Compass')}
            </p>
            <p className="text-base sm:text-lg font-semibold break-words">{displayedPrimaryGoal}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
              <span>{applyReplacements(translate('lifeCompass.alignment'), { value: compass.alignment_score })}</span>
              <span className="hidden sm:inline">•</span>
              <span>{applyReplacements(translate('lifeCompass.confidence'), { value: compass.confidence_score })}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              {translate('lifeCompass.suggestedGoals', 'Suggested Goals')}
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
                      <p className="font-semibold text-sm sm:text-base break-words">
                        {translate(`lifeCompass.goals.${goal.category}.title`)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {translate(`lifeCompass.goals.${goal.category}.description`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-xs sm:text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              {translate('lifeCompass.customGoal', 'Custom Goal')}
            </h3>
            <Textarea
              placeholder={translate('lifeCompass.customGoalPlaceholder')}
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
                  {translate(`lifeCompass.categoryLabels.${goal.category}`, goal.category)}
                </button>
              ))}
            </div>
            <Button
              onClick={handleCustomGoal}
              disabled={!customGoal.trim() || !selectedCategory || isUpdating}
              className="w-full"
            >
              {translate('lifeCompass.setCustomGoal', 'Set Custom Goal')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
