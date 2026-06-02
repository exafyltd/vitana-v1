import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, Zap } from "lucide-react";
import type {
  FoundationStepStatus,
  FoundationStepView,
} from "@/hooks/useJourneyFoundation";

/**
 * VTID-03255 — "Mein Weg": the foundation path. Deliberately NOT called a
 * checklist. Shows the ordered steps with live status, the current move
 * highlighted. Health (🌿) and economy (💠) strands are tagged so the user
 * sees both axes of the longevity journey from day one.
 */

function StepIcon({ status }: { status: FoundationStepStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
    case "active":
      return <Zap className="w-4 h-4 text-purple-600 shrink-0" />;
    case "checking":
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" />;
  }
}

export function FoundationPath({
  steps,
  currentKey,
}: {
  steps: FoundationStepView[];
  currentKey: string | null;
}) {
  if (!steps?.length) return null;

  return (
    <Card className="border-purple-100 bg-white/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Mein Weg
          </p>
          <span className="text-[11px] text-muted-foreground">
            {steps.filter((s) => s.status === "done" || s.status === "active").length}/{steps.length}
          </span>
        </div>
        <ul className="space-y-1.5">
          {steps.map((step) => {
            const isCurrent = step.key === currentKey;
            const muted = step.status === "open" || step.status === "not_found";
            return (
              <li
                key={step.key}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  isCurrent ? "bg-purple-50 ring-1 ring-purple-200" : ""
                }`}
              >
                <StepIcon status={step.status} />
                <span
                  className={`text-sm flex-1 min-w-0 truncate ${
                    muted && !isCurrent ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.title}
                </span>
                <span className="text-[11px] shrink-0">
                  {step.strand === "economy" ? "💠" : "🌿"}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-purple-700 font-medium shrink-0">
                    Nächster Schritt
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
