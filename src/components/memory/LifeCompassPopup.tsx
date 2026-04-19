import { useState } from "react";
import { Target, TrendingUp, Heart, DollarSign, Briefcase, GraduationCap, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
];

export function LifeCompassPopup({ open, onOpenChange }: LifeCompassPopupProps) {
  const { compass, updateCompass, isUpdating } = useLifeCompass();
  const [customGoal, setCustomGoal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Life Compass</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            Your Life Compass guides all AI recommendations and decisions. Choose a primary goal
            that matters most to you right now. The AI will prioritize suggestions that align
            with this direction.
          </DialogDescription>
        </DialogHeader>

        {compass && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Current Compass</p>
            <p className="text-lg font-semibold">{compass.primary_goal}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Alignment: {compass.alignment_score}%</span>
              <span>•</span>
              <span>Confidence: {compass.confidence_score}%</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Suggested Goals
            </h3>
            <div className="grid gap-3">
              {SUGGESTED_GOALS.map((goal) => {
                const Icon = goal.icon;
                return (
                  <button
                    key={goal.category}
                    onClick={() => handleSuggestedGoal(goal)}
                    disabled={isUpdating}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                      "hover:border-primary hover:shadow-md",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      `bg-gradient-to-r ${goal.gradient}`
                    )}
                  >
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{goal.title}</p>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Custom Goal
            </h3>
            <Textarea
              placeholder="Describe your primary goal in your own words..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              className="min-h-24 mb-3"
            />
            <div className="flex gap-2 mb-3">
              {SUGGESTED_GOALS.map((goal) => (
                <button
                  key={goal.category}
                  onClick={() => setSelectedCategory(goal.category)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm border-2 transition-colors",
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
