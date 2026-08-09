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

import { useEffect, useMemo, useState } from "react";
import { Play, Zap, AlertCircle, Info, CheckCircle2 } from "lucide-react";
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
import { t } from '@/lib/i18n-toast';

interface SimulatorPanelProps {
  tenantId?: string | null;
  defaultUtterance?: string;
  defaultLang?: string;
  // The screen currently open in the editor — lets the simulator pre-fill a
  // test phrase and tell you where THAT screen ranked.
  selectedScreenId?: string | null;
  suggestedUtterance?: string;
}

export function SimulatorPanel({
  tenantId,
  defaultUtterance = "",
  defaultLang = "en",
  selectedScreenId,
  suggestedUtterance,
}: SimulatorPanelProps) {
  const [utterance, setUtterance] = useState(defaultUtterance);
  const [lang, setLang] = useState(defaultLang);
  const [currentRoute, setCurrentRoute] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const simulate = useSimulateNavigator();

  const result = simulate.data;

  // When the admin selects a screen that has trigger phrases, pre-fill the
  // utterance with one so testing "does this route to my screen?" is one click.
  useEffect(() => {
    if (suggestedUtterance) setUtterance(suggestedUtterance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScreenId, suggestedUtterance]);

  // Where did the selected screen land in this run? 1 = top pick, >1 = ranked,
  // 0 = not in the top picks, null = nothing to compare.
  const selectedRank = useMemo<number | null>(() => {
    if (!result || !selectedScreenId) return null;
    const idx = result.top_picks.findIndex((p) => p.screen_id === selectedScreenId);
    if (idx >= 0) return idx + 1;
    return result.primary?.screen_id === selectedScreenId ? 1 : 0;
  }, [result, selectedScreenId]);

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
          {t('screens.admin.liveSimulator')}
        </CardTitle>
        <CardDescription>{t('screens.admin.runRealNavigatorPipelineAgainstTest')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sim-utterance">{t('screens.admin.utterance')}</Label>
          <Textarea
            id="sim-utterance"
            value={utterance}
            onChange={(e) => setUtterance(e.target.value)}
            placeholder={t('screens.admin.eGHowDoITrack')}
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sim-lang">{t('screens.admin.language')}</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="sim-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('screens.admin.english')}</SelectItem>
                <SelectItem value="de">{t('screens.admin.deutsch')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sim-current">{t('screens.admin.currentRoute')}</Label>
            <Input
              id="sim-current"
              value={currentRoute}
              onChange={(e) => setCurrentRoute(e.target.value)}
              placeholder={t('screens.admin.home')}
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
          <span>{t('screens.admin.simulateAnonymousSession')}</span>
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
            {selectedScreenId && selectedRank != null && (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                  selectedRank === 1
                    ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                    : selectedRank > 1
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }`}
              >
                {selectedRank === 1 ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  {selectedRank === 1
                    ? t('screens.admin.selectedScreenTopPick')
                    : selectedRank > 1
                    ? t('screens.admin.selectedScreenRanked', { rank: selectedRank })
                    : t('screens.admin.selectedScreenNotInPicks')}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${confidenceColor}`}>
                {result.confidence.toUpperCase()}
              </span>
              <Badge variant="outline" className="text-xs">
                {result.decision_source}
              </Badge>
              <span className="text-xs text-muted-foreground">{t('screens.admin.ms_elapsedMs', { ms_elapsed: result.ms_elapsed })}
              </span>
            </div>

            {result.blocked_reason && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>{t('screens.admin.blockedBlocked_reason', { blocked_reason: result.blocked_reason })}</span>
              </div>
            )}

            {result.primary && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{t('screens.admin.primaryPick')}</div>
                <div className="font-mono text-sm">{result.primary.screen_id}</div>
                <div className="text-sm">{result.primary.title}</div>
                <div className="text-xs text-muted-foreground">{result.primary.route}</div>
                {result.primary.score != null && (
                  <div className="mt-1 text-xs">{t('screens.admin.score')} <span className="font-mono">{result.primary.score}</span>
                  </div>
                )}
              </div>
            )}

            {result.top_picks.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('screens.admin.topPicksRanked')}
                </div>
                <div className="space-y-1">
                  {result.top_picks.map((p, i) => (
                    <div
                      key={p.screen_id + i}
                      className={`flex items-center justify-between rounded border px-2 py-1.5 text-xs ${
                        p.screen_id === selectedScreenId
                          ? "border-primary ring-1 ring-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground">{p.route}</span>
                        {p.screen_id === selectedScreenId && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <span className="font-mono">{p.score ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggested_question && (
              <div className="rounded-md border bg-primary/5 p-2 text-xs italic">{t('screens.admin.clarificationSuggested_question', { suggested_question: result.suggested_question })}
              </div>
            )}

            {result.explanation && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t('screens.admin.vitanaWouldSay')}</span>{" "}
                {result.explanation}
              </div>
            )}

            {result.kb_excerpts.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-medium">{t('screens.admin.kbExcerpts')}</div>
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
