import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import type {
  FoundationStepStatus,
  FoundationStepView,
} from "@/hooks/useJourneyFoundation";

/**
 * VTID-03255 — "Nächste Schritte": the onboarding next-steps overview. Shows the
 * ordered steps that set up the account and teach VitanaLand + the Maxina
 * community. Two states only: a green check for what is done, an empty circle
 * for what is still open — the current open step is highlighted as the next
 * step. No strand emojis, no per-state colours other than the green check, so
 * the user reads "done vs. open" at a glance.
 *
 * Step labels are localized here (keyed by step.key) so the German UI never
 * shows the gateway's English titles, and the labels are kept short — no
 * descriptive suffixes like "Understand the…" or "— your autonomous…".
 *
 * VTID-03300 — each step is a button: tapping it opens the ORB focused on that
 * exact step so Vitana drives it with the user ("Let's get your Profile set
 * up…"). When the step is verified complete, the snapshot poll flips its icon
 * to a green check. `onStepFocus` is optional so the list still renders
 * read-only where no handler is wired.
 */

/** Short, localized label for a step, falling back to the gateway title. */
function stepLabel(key: string, fallback: string): string {
  const label = t(`screens.autopilotdashboard.foundationStepLabels.${key}`);
  // lookup returns the key path itself when a translation is missing.
  return label.includes("foundationStepLabels") ? fallback : label;
}

function StepIcon({ status }: { status: FoundationStepStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
  }
  return <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
}

export function FoundationPath({
  steps,
  currentKey,
  onStepFocus,
}: {
  steps: FoundationStepView[];
  currentKey: string | null;
  /** VTID-03300 — tap a step to open the ORB focused on it. */
  onStepFocus?: (stepKey: string) => void;
}) {
  if (!steps?.length) return null;

  return (
    <Card className="border-purple-100 bg-white/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            {t("screens.autopilotdashboard.nextStepsTitle")}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {steps.filter((s) => s.status === "done").length}/{steps.length}
          </span>
        </div>
        <ul className="space-y-1.5">
          {steps.map((step) => {
            const isCurrent = step.key === currentKey;
            const muted = step.status !== "done";
            const label = stepLabel(step.key, step.title);
            const interactive = !!onStepFocus;
            return (
              <li key={step.key}>
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={interactive ? () => onStepFocus!(step.key) : undefined}
                  aria-label={
                    interactive
                      ? t("screens.autopilotdashboard.focusStepAria", { step: label })
                      : undefined
                  }
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isCurrent ? "bg-purple-50 ring-1 ring-purple-200" : ""
                  } ${
                    interactive
                      ? "hover:bg-purple-50/70 active:bg-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 cursor-pointer"
                      : "cursor-default"
                  }`}
                >
                  <StepIcon status={step.status} />
                  <span
                    className={`text-sm flex-1 min-w-0 truncate ${
                      muted && !isCurrent ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-purple-700 font-medium shrink-0">
                      {t("screens.autopilotdashboard.nextStepBadge")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
