/**
 * VTID-01975: Intent match detail page (P2-B).
 *
 * Drill-down view for a single intent. Shows the intent itself + its
 * top matches with action buttons. Used as the deeplink target from
 * push notifications.
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getIntent, getIntentMatches, closeIntent, type UserIntent, type IntentMatch } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentMatchCard } from "@/components/intents/IntentMatchCard";

export default function IntentMatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [matches, setMatches] = useState<IntentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [intentData, matchesData] = await Promise.all([
        getIntent(id),
        getIntentMatches(id, 10),
      ]);
      setIntent(intentData);
      setMatches(matchesData);
    } catch (err: any) {
      toast({ title: "Could not load match detail", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const handleClose = async () => {
    if (!id || !intent) return;
    try {
      await closeIntent(id);
      toast({ title: "Intent closed" });
      load();
    } catch (err: any) {
      toast({ title: "Could not close", description: err?.message ?? "", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-4">
        <Link to="/intents/mine" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to My Intents
        </Link>
        <p className="text-muted-foreground">Intent not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
      <Link to="/intents/mine" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to My Intents
      </Link>

      <IntentCard intent={intent} />

      {intent.status === "open" && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" /> Close intent
          </Button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">
          Matches ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No matches yet. We'll keep looking and notify you when someone matches.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <IntentMatchCard
                key={match.match_id}
                match={match}
                perspective="outgoing"
                onAction={() => load()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
