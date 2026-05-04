/**
 * VTID-01975: My intents page (P2-B).
 *
 * Lists the user's open intents grouped by kind. Each intent shows
 * match count + a "View matches" link → IntentMatchDetail.
 */

const PER_KIND_SLOT_CAP = 20; // VTID-02719: must mirror MATURE_MAX_OPEN_PER_KIND in gateway intent-throttle.ts

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listMyIntents, type UserIntent, type IntentKind } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";

const KIND_TABS: { value: IntentKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "commercial_buy", label: "Buying" },
  { value: "commercial_sell", label: "Selling" },
  { value: "activity_seek", label: "Activities" },
  { value: "partner_seek", label: "Partner" },
  { value: "social_seek", label: "Social" },
  { value: "mutual_aid", label: "Mutual aid" },
];

export default function MyIntents() {
  const { toast } = useToast();
  const [intents, setIntents] = useState<UserIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<IntentKind | "all">("all");
  const [composerOpen, setComposerOpen] = useState(false);

  // VTID-02719: always filter to open so a closed intent disappears from the
  // list as soon as the user returns from the detail page.
  const load = async () => {
    setLoading(true);
    try {
      const filters: { kind?: IntentKind; status?: string } = { status: "open" };
      if (tab !== "all") filters.kind = tab;
      const result = await listMyIntents(filters);
      setIntents(result);
    } catch (err: any) {
      toast({ title: "Could not load intents", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My intents</h1>
          <p className="text-sm text-muted-foreground">Your open requests, listings, and partner searches.</p>
          {!loading && (
            tab === "all" ? (
              <p className="text-xs text-muted-foreground mt-1">
                {intents.length} open · up to {PER_KIND_SLOT_CAP} per category
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {intents.length} of {PER_KIND_SLOT_CAP} slots used
                {intents.length >= PER_KIND_SLOT_CAP && (
                  <span className="ml-2 text-amber-700">— cap reached, close one to post a new {KIND_TABS.find(k => k.value === tab)?.label.toLowerCase()}</span>
                )}
              </p>
            )
          )}
        </div>
        <Button onClick={() => setComposerOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KIND_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : intents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No intents in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {intents.map((intent) => (
            <IntentCard
              key={intent.intent_id}
              intent={intent}
              to={`/intents/match/${intent.intent_id}`}
            />
          ))}
        </div>
      )}

      <IntentComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => load()}
      />

      <p className="text-xs text-muted-foreground text-center">
        Browse what others are looking for: <Link to="/intents/board" className="underline">Community board</Link>
      </p>
    </div>
  );
}
