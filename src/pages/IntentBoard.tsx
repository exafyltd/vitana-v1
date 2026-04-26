/**
 * VTID-01975: Community-side intent board (P2-B).
 *
 * Compass-aware default feed. Server picks which kinds to show based on
 * the reader's active Life Compass goal. partner_seek is hidden by
 * default — only surfaces when explicitly requested via ?kind=partner_seek
 * (and even then rendered redacted).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getIntentBoard, type BoardResponse, type IntentKind } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";

const KIND_FILTERS: { value: IntentKind | "all"; label: string }[] = [
  { value: "all", label: "All (compass-aware)" },
  { value: "commercial_buy", label: "Buy / hire" },
  { value: "commercial_sell", label: "Sell / offer" },
  { value: "activity_seek", label: "Activity partners" },
  { value: "social_seek", label: "Coffee chats" },
  { value: "mutual_aid", label: "Lend / borrow" },
];

export default function IntentBoard() {
  const { toast } = useToast();
  const [data, setData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IntentKind | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getIntentBoard(filter === "all" ? {} : { kind: filter });
      setData(result);
    } catch (err: any) {
      toast({ title: "Could not load board", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Community board</h1>
          <p className="text-sm text-muted-foreground">
            What others are looking for. {data?.compass && (
              <>Surfaced for your <span className="font-medium">{data.compass}</span> focus.</>
            )}
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Post
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.intents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No open intents in this view. Be the first to post.
        </div>
      ) : (
        <div className="space-y-3">
          {data.intents.map((intent) => (
            <IntentCard key={intent.intent_id} intent={intent} showStatus={false} />
          ))}
        </div>
      )}

      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => load()}
      />

      <p className="text-xs text-muted-foreground text-center">
        Looking for your own intents? <Link to="/intents/mine" className="underline">View My Intents</Link>
      </p>
    </div>
  );
}
