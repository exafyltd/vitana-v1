/**
 * VTID-01975: Business Hub Opportunities (P2-B).
 *
 * Provider-side incoming-leads feed. Pulls /api/v1/intent-matches/incoming
 * filtered to commercial_sell pairings (so providers see commercial_buy
 * intents that match their offerings). Pro-role gated.
 *
 * Mounted at /business/opportunities (deeplink target from
 * intent_lead_for_counterparty push notifications).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsReseller } from "@/hooks/useIsReseller";
import { getIncomingMatches, type IntentMatch } from "@/lib/intentApi";
import { IntentMatchCard } from "@/components/intents/IntentMatchCard";

export default function BusinessOpportunities() {
  const { toast } = useToast();
  const { isReseller } = useIsReseller();
  const [matches, setMatches] = useState<IntentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getIncomingMatches(50);
      // Filter to commercial-side pairings — these are the "lead for me" rows.
      const commercial = all.filter((m) =>
        m.kind_pairing.includes("commercial_") &&
        m.kind_pairing.endsWith("commercial_sell")
      );
      setMatches(commercial);
    } catch (err: any) {
      toast({ title: "Could not load opportunities", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!isReseller) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4">
        <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Business Hub
        </Link>
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Opportunities are available for Pro accounts. Upgrade to access incoming leads.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <Link to="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Business Hub
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Incoming leads matching your offerings. Express interest to start a conversation.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No leads yet. We'll notify you when matching demand arrives. Make sure you have at least one commercial_sell listing posted under <Link to="/business/listings" className="underline">My Listings</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <IntentMatchCard
              key={m.match_id}
              match={m}
              perspective="incoming"
              onAction={() => load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
