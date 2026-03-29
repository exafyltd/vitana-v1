import { useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";
import { toast } from "sonner";

const firedRefs = new Set<string>();

export function useAutopilotComplete() {
  const { user } = useAuth();

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
        if (reward > 0) {
          toast.success(`+${reward} VTN earned!`, {
            description: `Task completed: ${rec.title}`,
          });
        }
      } catch (err) {
        console.warn("[AutopilotComplete] Failed for", sourceRef, err);
      }
    },
    [user]
  );

  return { completeBySourceRef };
}
