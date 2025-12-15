/**
 * BUSINESS STARTER PANEL
 * 
 * Guided onboarding panel for new business users to start earning.
 * Three-step flow: Create → Promote → Earn
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepStatus = "not_started" | "in_progress" | "completed";

interface BusinessStarterPanelProps {
  onCreateEventOrService: () => void;
  onCreatePromotion: () => void;
  onViewWallet: () => void;
  onStartGuidedFlow: () => void;
  step1Status?: StepStatus;
  step2Status?: StepStatus;
  step3Status?: StepStatus;
}

const getStatusIndicator = (status: StepStatus) => {
  switch (status) {
    case "completed":
      return { dot: "bg-emerald-500", text: "Completed", color: "text-emerald-600" };
    case "in_progress":
      return { dot: "bg-amber-500", text: "In progress", color: "text-amber-600" };
    default:
      return { dot: "bg-muted-foreground/30", text: "Not started", color: "text-muted-foreground/60" };
  }
};

export function BusinessStarterPanel({
  onCreateEventOrService,
  onCreatePromotion,
  onViewWallet,
  onStartGuidedFlow,
  step1Status = "not_started",
  step2Status = "not_started",
  step3Status = "not_started",
}: BusinessStarterPanelProps) {
  const steps = [
    {
      number: 1,
      title: "Create something to sell",
      description: "Create your first event or service to make it available for promotion and sales.",
      cta: "➕ Create event or service",
      onClick: onCreateEventOrService,
      status: step1Status,
    },
    {
      number: 2,
      title: "Promote & share",
      description: "Share your offer using reseller links or promotions to reach more people.",
      cta: "📣 Create promotion",
      onClick: onCreatePromotion,
      status: step2Status,
    },
    {
      number: 3,
      title: "Earn & track income",
      description: "Track your earnings and payouts directly in your wallet.",
      cta: "💳 View Wallet",
      onClick: onViewWallet,
      status: step3Status,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-card/90 via-card/70 to-accent/5 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Start earning with VITANA</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your guided path to launching your first business activity and generating income.
        </p>
      </div>

      {/* Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => {
          const statusIndicator = getStatusIndicator(step.status);
          return (
            <div
              key={step.number}
              className="bg-background/70 backdrop-blur-md rounded-xl border border-border/20 p-5 space-y-4 hover:shadow-md hover:border-border/40 transition-all"
            >
              {/* Step Number & Title */}
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-accent/15 text-accent text-xs font-semibold flex items-center justify-center">
                  {step.number}
                </span>
                <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* CTA Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full text-xs"
                onClick={step.onClick}
              >
                {step.cta}
              </Button>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", statusIndicator.dot)} />
                <span className={cn("text-[10px]", statusIndicator.color)}>
                  {statusIndicator.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary CTA */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={onStartGuidedFlow}
          className="rounded-full gap-2 px-6 shadow-md hover:shadow-lg transition-all"
        >
          🚀 Guide me to my first earnings
        </Button>
      </div>
    </div>
  );
}
