/**
 * VTID-01975: Intent match card (P2-B).
 *
 * Single match row. Shows counterparty's @vitana_id, score breakdown
 * chips, and Express Interest / Decline buttons. For partner_seek
 * pre-reveal matches, vitana_id_b is hidden — the card shows a redacted
 * label "Anonymous match (mutual reveal)".
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { transitionMatch, declineMatch, type IntentMatch } from "@/lib/intentApi";

interface IntentMatchCardProps {
  match: IntentMatch;
  perspective: "outgoing" | "incoming"; // Are we party A (dictator) or B (counterparty)?
  onAction?: () => void;
}

export function IntentMatchCard({ match, perspective, onAction }: IntentMatchCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"interest" | "decline" | null>(null);

  const counterpartyVid = perspective === "outgoing" ? match.vitana_id_b : match.vitana_id_a;
  const isPartnerSeek = match.kind_pairing.startsWith("partner_seek");
  const isRedacted = !counterpartyVid && (match.redacted || isPartnerSeek);

  const reasons = match.match_reasons as Record<string, number>;
  const scorePct = Math.round(match.score * 100);

  const expressInterest = async () => {
    setBusy("interest");
    try {
      const newState = perspective === "outgoing" ? "responded_by_a" : "responded_by_b";
      await transitionMatch(match.match_id, newState);
      toast({ title: "Interest recorded", description: "If they're interested too, we'll connect you." });
      onAction?.();
    } catch (err: any) {
      toast({ title: "Could not record interest", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy("decline");
    try {
      await declineMatch(match.match_id);
      toast({ title: "Declined" });
      onAction?.();
    } catch (err: any) {
      toast({ title: "Could not decline", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const isMutual = match.state === "mutual_interest" || match.state === "engaged" || match.state === "fulfilled";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          {isRedacted ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-wide text-muted-foreground">
                Anonymous match
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                mutual reveal
              </span>
            </div>
          ) : (
            <p className="text-base font-semibold tracking-wide">@{counterpartyVid ?? "—"}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{match.kind_pairing.replace("::", " ↔ ")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{scorePct}%</p>
          {match.compass_aligned && (
            <p className="text-xs text-amber-600 mt-0.5">⭐ compass-aligned</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {Object.entries(reasons || {})
          .filter(([, v]) => typeof v === "number" && v > 0)
          .map(([k, v]) => (
            <span key={k} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {k}: {Math.round(Number(v) * 100)}%
            </span>
          ))}
      </div>

      {isMutual ? (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          🎉 Mutual interest — open the message thread to start chatting.
        </div>
      ) : match.state === "declined" || match.state === "closed" ? (
        <p className="text-sm text-muted-foreground italic">{match.state}</p>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={expressInterest}
            disabled={busy !== null}
          >
            {busy === "interest" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Express interest"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={decline}
            disabled={busy !== null}
          >
            {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
          </Button>
        </div>
      )}
    </div>
  );
}
