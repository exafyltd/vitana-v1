/**
 * VTID-01975: Intent match card (P2-B).
 *
 * Single match row. Shows counterparty's @vitana_id, score breakdown
 * chips, and Express Interest / Decline buttons. For partner_seek
 * pre-reveal matches, vitana_id_b is hidden — the card shows a redacted
 * label "Anonymous match (mutual reveal)".
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Flag } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { transitionMatch, declineMatch, type IntentMatch } from "@/lib/intentApi";
import { DisputeModal } from "./DisputeModal";
import { notify, notifyError } from '@/lib/i18n-toast';

interface IntentMatchCardProps {
  match: IntentMatch;
  perspective: "outgoing" | "incoming"; // Are we party A (dictator) or B (counterparty)?
  onAction?: () => void;
}

function initialsFor(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "?"
  );
}

// E6 — gender-aware DiceBear avatar fallback. We seed on vitana_id so each
// user gets a consistent avatar across sessions. Gender narrows the visual
// (hair / clothes); when gender is null we let DiceBear pick from the
// full pool for that seed.
function buildAvatarFallbackUrl(seed: string, gender: 'male' | 'female' | null): string {
  const params = new URLSearchParams({ seed });
  if (gender === 'male') {
    params.set('topType', 'ShortHairShortFlat,ShortHairTheCaesar,ShortHairFrizzle,ShortHairShortCurly');
    params.set('facialHairType', 'Default,BeardLight,BeardMedium');
    params.set('clotheType', 'ShirtCrewNeck,Hoodie,GraphicShirt');
  } else if (gender === 'female') {
    params.set('topType', 'LongHairStraight,LongHairCurly,LongHairBob,LongHairCurvy,LongHairStraight2');
    params.set('accessoriesType', 'Round,Sunglasses,Blank');
    params.set('clotheType', 'BlazerShirt,Hoodie,ShirtVNeck');
  }
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export function IntentMatchCard({ match, perspective, onAction }: IntentMatchCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"interest" | "decline" | null>(null);

  const counterpartyVid = perspective === "outgoing" ? match.vitana_id_b : match.vitana_id_a;
  const isPartnerSeek = match.kind_pairing.startsWith("partner_seek");
  const isRedacted = !counterpartyVid && (match.redacted || isPartnerSeek);

  const avatarSrc = !isRedacted
    ? (match.partner_avatar_url
      || (counterpartyVid ? buildAvatarFallbackUrl(counterpartyVid, match.partner_gender ?? null) : undefined))
    : undefined;
  const avatarInitials = isRedacted ? "?" : initialsFor(match.partner_display_name ?? counterpartyVid);
  const canOpenProfile = !isRedacted && !!counterpartyVid;

  const reasons = match.match_reasons as Record<string, number>;
  const scorePct = Math.round(match.score * 100);

  const expressInterest = async () => {
    setBusy("interest");
    try {
      const newState = perspective === "outgoing" ? "responded_by_a" : "responded_by_b";
      await transitionMatch(match.match_id, newState);
      notify('toasts.intents.interestRecorded', 'toasts.intents.ifTheyReInterestedTooWe');
      onAction?.();
    } catch (err: any) {
      notifyError('toasts.intents.couldNotRecordInterest');
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy("decline");
    try {
      await declineMatch(match.match_id);
      notify('toasts.intents.declined');
      onAction?.();
    } catch (err: any) {
      notifyError('toasts.intents.couldNotDecline');
    } finally {
      setBusy(null);
    }
  };

  const isMutual = match.state === "mutual_interest" || match.state === "engaged" || match.state === "fulfilled";
  const [disputeOpen, setDisputeOpen] = useState(false);
  // VTID-01976 (P2-C): dispute is available once the match has progressed
  // beyond initial surfacing (mutual interest, engaged, or fulfilled). Not
  // for `new` rows — there's nothing to dispute yet.
  const canDispute = isMutual || match.state === "responded_by_a" || match.state === "responded_by_b";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => canOpenProfile && navigate(`/u/${counterpartyVid}`)}
            disabled={!canOpenProfile}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default disabled:opacity-100"
            aria-label={canOpenProfile ? `Open ${match.partner_display_name ?? counterpartyVid}'s profile` : 'Anonymous match'}
          >
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={match.partner_display_name ?? counterpartyVid ?? ""} /> : null}
              <AvatarFallback>{avatarInitials}</AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0">
            {isRedacted ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold tracking-wide text-muted-foreground">
                  Anonymous match
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  mutual reveal
                </span>
              </div>
            ) : match.partner_display_name ? (
              <>
                <p className="text-base font-semibold tracking-wide truncate">{match.partner_display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{counterpartyVid ?? "—"}</p>
              </>
            ) : (
              <p className="text-base font-semibold tracking-wide truncate">@{counterpartyVid ?? "—"}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{match.kind_pairing.replace("::", " ↔ ")}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
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
        <div className="space-y-2">
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            🎉 Mutual interest — open the message thread to start chatting.
          </div>
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <Flag className="h-3 w-3" /> Report an issue
          </button>
        </div>
      ) : match.state === "declined" || match.state === "closed" ? (
        <p className="text-sm text-muted-foreground italic">{match.state}</p>
      ) : (
        <div className="flex gap-2 items-center">
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
          {canDispute && (
            <button
              type="button"
              onClick={() => setDisputeOpen(true)}
              className="ml-auto text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <Flag className="h-3 w-3" /> Report
            </button>
          )}
        </div>
      )}

      {/* VTID-01976 (P2-C): dispute modal mount */}
      <DisputeModal
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        matchId={match.match_id}
        onRaised={() => onAction?.()}
      />
    </div>
  );
}
