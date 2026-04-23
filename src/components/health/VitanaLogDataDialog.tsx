import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

type PillarKey = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

interface FeatureOption {
  feature_key: string;
  label: string;
  unit: string;
  placeholder: string;
}

const FEATURES: Record<PillarKey, FeatureOption[]> = {
  nutrition: [
    { feature_key: "biomarker_glucose", label: "Fasting glucose", unit: "mg/dL", placeholder: "e.g. 92" },
    { feature_key: "meal_log", label: "Meals logged", unit: "count", placeholder: "e.g. 3" },
    { feature_key: "macro_balance", label: "Macro balance score", unit: "0–100", placeholder: "e.g. 80" },
  ],
  hydration: [
    { feature_key: "water_intake", label: "Water intake", unit: "ml", placeholder: "e.g. 2000" },
    { feature_key: "hydration_log", label: "Hydration check-ins", unit: "count", placeholder: "e.g. 4" },
  ],
  exercise: [
    { feature_key: "wearable_steps", label: "Steps", unit: "count", placeholder: "e.g. 8500" },
    { feature_key: "wearable_heart_rate", label: "Avg heart rate", unit: "bpm", placeholder: "e.g. 72" },
    { feature_key: "wearable_workout", label: "Workout minutes", unit: "min", placeholder: "e.g. 30" },
    { feature_key: "vo2_max", label: "VO₂-max estimate", unit: "ml/kg/min", placeholder: "e.g. 42" },
  ],
  sleep: [
    { feature_key: "wearable_sleep_duration", label: "Sleep duration", unit: "hours", placeholder: "e.g. 7.5" },
    { feature_key: "wearable_sleep_efficiency", label: "Sleep efficiency", unit: "%", placeholder: "e.g. 88" },
    { feature_key: "wearable_hrv", label: "HRV (overnight avg)", unit: "ms", placeholder: "e.g. 45" },
  ],
  mental: [
    { feature_key: "meditation_minutes", label: "Meditation minutes", unit: "min", placeholder: "e.g. 10" },
    { feature_key: "mood_entry", label: "Mood score", unit: "1–10", placeholder: "e.g. 7" },
    { feature_key: "wearable_stress", label: "Stress (wearable)", unit: "0–100", placeholder: "e.g. 30" },
    { feature_key: "journal_entry", label: "Journal entries today", unit: "count", placeholder: "e.g. 1" },
  ],
};

const PILLAR_LABELS: Record<PillarKey, string> = {
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise:  "Exercise",
  sleep:     "Sleep",
  mental:    "Mental",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VitanaLogDataDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pillar, setPillar] = useState<PillarKey>("hydration");
  const [featureKey, setFeatureKey] = useState<string>(FEATURES.hydration[0].feature_key);
  const [value, setValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const options = FEATURES[pillar];
  const selected = options.find((o) => o.feature_key === featureKey) ?? options[0];

  const handlePillarChange = (p: PillarKey) => {
    setPillar(p);
    setFeatureKey(FEATURES[p][0].feature_key);
  };

  const handleSubmit = async () => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      toast({ title: "Enter a number", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const res = await fetch(`${GATEWAY_URL}/integrations/manual/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pillar,
          feature_key: selected.feature_key,
          value: numericValue,
          unit: selected.unit,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.detail || json.error || "Log failed");
      }
      toast({
        title: "Logged — your Index is recomputing",
        description: `${PILLAR_LABELS[pillar]} · ${selected.label}: ${numericValue} ${selected.unit}`,
      });
      // Invalidate Index + agent queries so the badge + Detail refresh.
      queryClient.invalidateQueries({ queryKey: ["vitana_index"] });
      queryClient.invalidateQueries({ queryKey: ["pillar_agents_outputs"] });
      setValue("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not save",
        description: (err.message || "Try again in a moment.").slice(0, 300),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a data point</DialogTitle>
          <DialogDescription>
            Add a single health data point today. The corresponding pillar agent will
            see it within a second and the Connected Data segment on that pillar's
            bar will grow.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pillar</Label>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {(Object.keys(FEATURES) as PillarKey[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePillarChange(p)}
                  className={`h-9 rounded-md text-xs font-medium transition ${
                    pillar === p
                      ? "bg-calendar-primary text-white"
                      : "bg-background text-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {PILLAR_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Metric</Label>
            <select
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value)}
              className="mt-2 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {options.map((o) => (
                <option key={o.feature_key} value={o.feature_key}>
                  {o.label} ({o.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="log-data-value" className="text-xs uppercase tracking-wider text-muted-foreground">
              Value ({selected.unit})
            </Label>
            <Input
              id="log-data-value"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selected.placeholder}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !value}>
            {submitting ? "Saving…" : "Log data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
