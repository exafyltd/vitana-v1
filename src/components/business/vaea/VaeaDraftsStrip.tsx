import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, X, ChevronDown, ChevronRight } from "lucide-react";
import { useVaeaDrafts, type VaeaDraft } from "@/hooks/useVaea";

const TIER_BADGE: Record<string, string> = {
  own: "bg-emerald-100 text-emerald-800",
  vetted_partner: "bg-sky-100 text-sky-800",
  affiliate_network: "bg-amber-100 text-amber-800",
};

/**
 * Compact drafts strip — shows a header with count and an expand toggle.
 * Hidden entirely when there are no open drafts, so it doesn't clutter the
 * Sell & Earn tab until VAEA actually produces something.
 */
export function VaeaDraftsStrip() {
  const { drafts, loading, error, dismiss, reload } = useVaeaDrafts(25);
  const [open, setOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  if (loading || error) return null;
  if (drafts.length === 0) return null;

  return (
    <Card className="bg-primary/5 border-primary/20 mb-3">
      <CardContent className="py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2"
        >
          <div className="text-left">
            <div className="font-medium text-sm">Autopilot has {drafts.length} referral draft{drafts.length === 1 ? "" : "s"} for you</div>
            <p className="text-xs text-muted-foreground">Shadow drafts — review and dismiss. Posting arrives in a later phase.</p>
          </div>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {open && (
          <div className="space-y-2 mt-3">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                dismissing={dismissingId === draft.id}
                onDismiss={async () => {
                  setDismissingId(draft.id);
                  try { await dismiss(draft.id); } finally { setDismissingId(null); }
                }}
              />
            ))}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={reload}>Refresh</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraftRow({ draft, dismissing, onDismiss }: {
  draft: VaeaDraft;
  dismissing: boolean;
  onDismiss: () => void | Promise<void>;
}) {
  const q = draft.vaea_detected_questions;
  return (
    <div className="rounded-lg border border-white/30 bg-white/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize">{draft.status}</Badge>
          {draft.match_tier && (
            <Badge className={TIER_BADGE[draft.match_tier] || "bg-muted"}>
              {draft.match_tier.replace("_", " ")}
            </Badge>
          )}
          {draft.match_score != null && (
            <Badge variant="secondary">score {draft.match_score.toFixed(2)}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void onDismiss()} disabled={dismissing}>
          {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {q?.message_body && (
        <div className="rounded bg-muted/40 border p-2">
          <div className="text-xs text-muted-foreground mb-0.5">
            {q.platform || "?"}{q.author_handle ? ` · @${q.author_handle}` : ""}
          </div>
          <p className="text-sm">{q.message_body}</p>
          {q.message_url && (
            <a
              href={q.message_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="rounded border border-primary/20 bg-primary/5 p-2">
        <div className="text-xs font-medium mb-0.5 text-muted-foreground">Autopilot draft</div>
        <p className="text-sm whitespace-pre-wrap">{draft.reply_body}</p>
      </div>

      {draft.match_reason && (
        <p className="text-xs text-muted-foreground">Why: {draft.match_reason}</p>
      )}
    </div>
  );
}
