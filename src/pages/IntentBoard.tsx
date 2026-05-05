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
import { useToast } from '@/hooks/use-toast';
import { getIntentBoard, type BoardResponse, type IntentKind } from "@/lib/intentApi";
import { IntentCard } from "@/components/intents/IntentCard";
import { IntentComposer } from "@/components/intents/IntentComposer";
import { notifyError, t } from '@/lib/i18n-toast';

const KIND_FILTERS: { value: IntentKind | "all" | "dance"; label: string }[] = [
  { value: "all", label: "All (compass-aware)" },
  // VTID-DANCE-D9: meta-tab filtering on category prefix dance.*
  { value: "dance", label: "💃 Dance" },
  { value: "learning_seek", label: "Want to learn" },
  { value: "mentor_seek", label: "Offering to teach" },
  { value: "commercial_buy", label: "Buy / hire" },
  { value: "commercial_sell", label: "Sell / offer" },
  { value: "activity_seek", label: "Activity partners" },
  { value: "social_seek", label: "Coffee chats" },
  { value: "mutual_aid", label: "Lend / borrow" },
];

const DANCE_VARIETY_CHIPS = [
  { key: null, label: "Any" },
  { key: "salsa", label: "Salsa" },
  { key: "tango", label: "Tango" },
  { key: "bachata", label: "Bachata" },
  { key: "kizomba", label: "Kizomba" },
  { key: "swing", label: "Swing" },
  { key: "ballroom", label: "Ballroom" },
  { key: "hiphop", label: "Hip-hop" },
];

export default function IntentBoard() {
  const { toast } = useToast();
  const [data, setData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<IntentKind | "all" | "dance">("all");
  const [danceVariety, setDanceVariety] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // VTID-DANCE-D9: 'dance' meta-tab fetches all kinds; we client-filter
      // by category prefix dance.* below. Dedicated kind tabs forward as-is.
      const params = filter === "all" || filter === "dance" ? {} : { kind: filter };
      const result = await getIntentBoard(params);
      setData(result);
    } catch (err: any) {
      notifyError('toasts.intentboard.couldNotLoadBoard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const filteredIntents = (() => {
    const list = data?.intents ?? [];
    if (filter === "dance") {
      return list.filter((i) => {
        if (!i.category?.startsWith("dance.")) return false;
        if (!danceVariety) return true;
        const v = (i.kind_payload as any)?.dance?.variety;
        return v === danceVariety || i.category.includes(`.${danceVariety}`);
      });
    }
    return list;
  })();

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('screens.intentboard.communityBoard')}</h1>
          <p className="text-sm text-muted-foreground">
            What others are looking for. {data?.compass && (
              <>Surfaced for your <span className="font-medium">{data.compass}</span> {t('screens.intentboard.focus')}</>
            )}
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {t('screens.intentboard.post')}
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

      {filter === "dance" && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground self-center mr-1">{t('screens.intentboard.style')}</span>
          {DANCE_VARIETY_CHIPS.map((c) => (
            <button
              key={c.key ?? "any"}
              onClick={() => setDanceVariety(c.key)}
              className={`px-2.5 py-0.5 rounded-md text-xs border transition-colors ${
                danceVariety === c.key
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background hover:bg-muted border-border text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredIntents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {filter === "dance"
            ? danceVariety
              ? `No open ${danceVariety} posts yet — be the first.`
              : "No open dance posts yet — post yours and you're the first!"
            : "No open intents in this view. Be the first to post."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIntents.map((intent) => (
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
        {t('screens.intentboard.lookingForYourOwnIntents')} <Link to="/intents/mine" className="underline">{t('screens.intentboard.viewMyIntents')}</Link>
      </p>
    </div>
  );
}
