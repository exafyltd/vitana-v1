/**
 * VTID-NAV-02: Live Navigator Simulator panel.
 *
 * Admin types an utterance, picks a language and (optionally) a simulated
 * current route + tenant, hits "Run", and sees the real consultNavigator()
 * result including top-3 picks with scores, decision source, confidence,
 * blocked reason, and KB excerpts. This is the feedback loop the admin
 * uses to decide whether their edit produces the right redirect BEFORE
 * saving — and to reproduce "wrong screen" bug reports from real users.
 */

import { useState } from "react";
import { Play, Zap, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSimulateNavigator } from "@/hooks/useAdminNavigator";

interface SimulatorPanelProps {
  tenantId?: string | null;
  defaultUtterance?: string;
  defaultLang?: string;
}

export function SimulatorPanel({
  tenantId,
  defaultUtterance = "",
  defaultLang = "en",
}: SimulatorPanelProps) {
  const [utterance, setUtterance] = useState(defaultUtterance);
  const [lang, setLang] = useState(defaultLang);
  const [currentRoute, setCurrentRoute] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const simulate = useSimulateNavigator();

  const result = simulate.data;

  async function onRun() {
    if (!utterance.trim()) return;
    await simulate.mutateAsync({
      utterance: utterance.trim(),
      lang,
      current_route: currentRoute.trim() || undefined,
      is_anonymous: isAnonymous,
      tenant_id: tenantId || undefined,
    });
  }

  const confidenceColor =
    result?.confidence === "high"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : result?.confidence === "medium"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-red-500/15 text-red-700 dark:text-red-400";

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Live Simulator
        </CardTitle>
        <CardDescription>
          Run the real Navigator pipeline against a test utterance. Shows top-3 picks with scores so
          you can tell if your trigger edit landed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sim-utterance">Utterance</Label>
          <Textarea
            id="sim-utterance"
            value={utterance}
            onChange={(e) => setUtterance(e.target.value)}
            placeholder="e.g. how do I track my biology"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sim-lang">Language</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="sim-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim-current">Current route</Label>
            <Input
              id="sim-current"
              value={currentRoute}
              onChange={(e) => setCurrentRoute(e.target.value)}
              placeholder="/home"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded border-input"
          />
          <span>Simulate anonymous session</span>
        </label>

        <Button
          onClick={onRun}
          disabled={!utterance.trim() || simulate.isPending}
          className="w-full"
        >
          <Play className="mr-2 h-4 w-4" />
          {simulate.isPending ? "Running…" : "Run simulation"}
        </Button>

        {simulate.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(simulate.error as Error)?.message || "Simulation failed"}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${confidenceColor}`}>
                {result.confidence.toUpperCase()}
              </span>
              <Badge variant="outline" className="text-xs">
                {result.decision_source}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.ms_elapsed}ms
              </span>
            </div>

            {result.blocked_reason && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>Blocked: {result.blocked_reason}</span>
              </div>
            )}

            {result.primary && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Primary pick</div>
                <div className="font-mono text-sm">{result.primary.screen_id}</div>
                <div className="text-sm">{result.primary.title}</div>
                <div className="text-xs text-muted-foreground">{result.primary.route}</div>
                {result.primary.score != null && (
                  <div className="mt-1 text-xs">
                    score: <span className="font-mono">{result.primary.score}</span>
                  </div>
                )}
              </div>
            )}

            {result.top_picks.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Top picks (ranked)
                </div>
                <div className="space-y-1">
                  {result.top_picks.map((p, i) => (
                    <div
                      key={p.screen_id + i}
                      className="flex items-center justify-between rounded border px-2 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground">{p.route}</span>
                      </div>
                      <span className="font-mono">{p.score ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggested_question && (
              <div className="rounded-md border bg-primary/5 p-2 text-xs italic">
                Clarification: "{result.suggested_question}"
              </div>
            )}

            {result.explanation && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Vitana would say:</span>{" "}
                {result.explanation}
              </div>
            )}

            {result.kb_excerpts.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-medium">KB excerpts</div>
                <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {result.kb_excerpts.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
