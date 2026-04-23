import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

interface AgentOutput {
  pillar: "nutrition" | "hydration" | "exercise" | "sleep" | "mental";
  date: string;
  subscore_baseline: number;
  subscore_completions: number;
  subscore_data: number;
  subscore_streak: number;
  agent_version: string;
  computed_at: string;
}

const PILLAR_LABELS: Record<AgentOutput["pillar"], string> = {
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise:  "Exercise",
  sleep:     "Sleep",
  mental:    "Mental",
};

async function fetchPillarAgentOutputs(): Promise<AgentOutput[]> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return [];

  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${GATEWAY_URL}/pillar-agents/outputs?date=${today}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.outputs as AgentOutput[]) ?? [];
}

/**
 * A small read-only panel on the Index Detail screen that shows which of the
 * five pillar agents ran for the user today and what each one wrote.
 * Reads /api/v1/pillar-agents/outputs which is RLS-scoped to the caller.
 */
export function VitanaPillarAgentsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["pillar_agents_outputs", "today"],
    queryFn: fetchPillarAgentOutputs,
    staleTime: 30_000,
  });

  const outputs = data ?? [];
  const byPillar = new Map(outputs.map(o => [o.pillar, o]));
  const pillars: AgentOutput["pillar"][] = ["nutrition", "hydration", "exercise", "sleep", "mental"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-calendar-primary" />
            <CardTitle className="text-base">Active agents</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {outputs.length}/5 ran today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Checking agents…</p>}
        {!isLoading && outputs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No agent output today yet. The five pillar agents run on each Index recompute and when you mark a journey event complete.
          </p>
        )}
        {!isLoading && outputs.length > 0 && (
          <ul className="space-y-2">
            {pillars.map((p) => {
              const out = byPillar.get(p);
              const total = out
                ? out.subscore_baseline + out.subscore_completions + out.subscore_data + out.subscore_streak
                : 0;
              return (
                <li key={p} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {out ? (
                      <CheckCircle2 className="w-4 h-4 text-calendar-success" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-dashed border-muted-foreground/40" />
                    )}
                    <span className="font-medium">Pillar Agent — {PILLAR_LABELS[p]}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {out ? `${total}/200 · ${out.agent_version}` : "no output yet"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground pt-1">
          Each pillar is watched by its own specialist agent. v1 mirrors the
          compute engine's math; v2+ adds third-party integrations
          (Apple Health, Oura, MyFitnessPal, and more) per pillar.
        </p>
      </CardContent>
    </Card>
  );
}

export default VitanaPillarAgentsPanel;
