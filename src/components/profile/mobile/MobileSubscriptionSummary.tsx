import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/useBilling";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";

export function MobileSubscriptionSummary({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useBilling();

  if (isLoading) {
    return (
      <div className={cn("px-4 pb-2", className)}>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }
  if (!data) return null;

  const plan = data.plan;
  const isFree = plan.plan_key === "free" || plan.status === "free";
  const isPastDue = plan.status === "past_due" || plan.status === "unpaid";
  const isTrialing = plan.status === "trialing";

  let icon = <Sparkles className="w-4 h-4" />;
  let title = t("billing.state.premiumActive");
  let subtitle: string | null = null;
  let tone: "neutral" | "primary" | "destructive" = "primary";

  if (isFree) {
    icon = <Sparkles className="w-4 h-4" />;
    title = t("billing.state.freeStatus");
    subtitle = t("billing.state.freeBody");
    tone = "neutral";
  } else if (isPastDue) {
    icon = <AlertCircle className="w-4 h-4" />;
    title = t("billing.state.pastDue");
    subtitle = t("billing.state.pastDueBody");
    tone = "destructive";
  } else if (isTrialing && plan.trial_end) {
    icon = <Check className="w-4 h-4" />;
    title = t("billing.state.premiumActive");
    subtitle = t("billing.state.trialEndsAt", { date: fmtDate(new Date(plan.trial_end)) });
  } else if (plan.current_period_end) {
    title = t("billing.state.premiumActive");
    subtitle = plan.cancel_at_period_end
      ? t("billing.state.cancelAtPeriodEnd")
      : t("billing.mobileBilling.summaryRenewsOn", { date: fmtDate(new Date(plan.current_period_end)) });
  }

  const toneStyles: Record<typeof tone, string> = {
    neutral: "bg-muted/40 hover:bg-muted/60 border-border/50 text-foreground",
    primary:
      "bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border-primary/30 text-foreground",
    destructive:
      "bg-destructive/5 hover:bg-destructive/10 border-destructive/30 text-foreground",
  };
  const iconBg: Record<typeof tone, string> = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div className={cn("px-4 pb-2", className)}>
      <button
        onClick={() => navigate("/profile/subscriptions")}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-left",
          toneStyles[tone],
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            iconBg[tone],
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}
