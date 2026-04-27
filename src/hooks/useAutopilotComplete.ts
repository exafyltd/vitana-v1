import { useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";
import { toast } from "sonner";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { celebrate } from "@/lib/celebrate";
import type { ContributionVector } from "@/types/autopilot";

const firedRefs = new Set<string>();
const SUPPRESS_LIFT_WINDOW_MS = 2000;

function sumVector(vector: ContributionVector | null | undefined): number {
  if (!vector) return 0;
  return Object.values(vector).reduce<number>(
    (acc, v) => acc + (typeof v === "number" && v > 0 ? v : 0),
    0,
  );
}

export function useAutopilotComplete() {
  const { user } = useAuth();
  const { index } = useVitanaIndexCache();

  const completeBySourceRef = useCallback(
    async (sourceRef: string) => {
      if (!user || firedRefs.has(sourceRef)) return;
      firedRefs.add(sourceRef);

      try {
        const res = await communityFetch("/api/v1/autopilot/recommendations");
        if (!res.ok) return;
        const { recommendations } = await res.json();
        const rec = recommendations?.find(
          (r: any) => r.source_ref === sourceRef && r.status !== "completed"
        );
        if (!rec) return;

        const completeRes = await communityFetch(
          `/api/v1/autopilot/recommendations/${rec.id}/complete`,
          { method: "POST" }
        );
        if (!completeRes.ok) return;
        const { reward } = await completeRes.json();

        const vector: ContributionVector | undefined = rec.contribution_vector;
        const magnitude = sumVector(vector);

        if (vector && magnitude > 0) {
          // Suppress the watcher's auto-toast for the next ~2s — this single
          // celebrate() call produces the unified Index + VTN toast.
          (window as unknown as { __vitanaSuppressLiftUntil?: number }).__vitanaSuppressLiftUntil =
            Date.now() + SUPPRESS_LIFT_WINDOW_MS;

          const previousTotal = index?.total ?? null;
          const predictedTotal =
            previousTotal !== null ? previousTotal + magnitude : undefined;

          celebrate({
            kind: "index-lift",
            vector,
            newTotal: predictedTotal,
            magnitude,
            vtnReward: typeof reward === "number" ? reward : undefined,
            source: "autopilot",
          });
        } else if (reward > 0) {
          toast.success(`+${reward} VTN earned!`, {
            description: `Task completed: ${rec.title}`,
          });
        }
      } catch (err) {
        console.warn("[AutopilotComplete] Failed for", sourceRef, err);
      }
    },
    [user, index]
  );

  return { completeBySourceRef };
}
