/**
 * VTID-DANCE-D7: Open Asks public feed.
 *
 * Cold-start primer: every public intent post that has zero matches yet
 * is browsable here. The "always post even if there's no match" UX
 * principle made concrete — your post is never invisible.
 *
 * Anyone in the community can browse. Click a card → /p/<intent_id> for
 * the full post + share/respond.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

type AskRow = {
  intent_id: string;
  requester_vitana_id: string | null;
  intent_kind: string;
  category: string | null;
  title: string;
  scope_excerpt: string;
  kind_payload: Record<string, any> | null;
  created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  commercial_buy: "Buying",
  commercial_sell: "Selling",
  activity_seek: "Activity partner",
  partner_seek: "Life partner",
  social_seek: "Social",
  mutual_aid: "Mutual aid",
  learning_seek: "Wants to learn",
  mentor_seek: "Offering to teach",
};

const KIND_FILTERS = [
  { key: null as string | null, label: "All" },
  { key: "learning_seek", label: "Wants to learn" },
  { key: "mentor_seek", label: "Offering to teach" },
  { key: "activity_seek", label: "Activity" },
  { key: "commercial_buy", label: "Buying" },
  { key: "commercial_sell", label: "Selling" },
  { key: "social_seek", label: "Social" },
  { key: "mutual_aid", label: "Mutual aid" },
];

const DANCE_FILTERS = [
  { prefix: null as string | null, label: "Everything" },
  { prefix: "dance.", label: "💃 Dance only" },
];

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OpenAsks() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [asks, setAsks] = useState<AskRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const [danceOnly, setDanceOnly] = useState(false);

  const fetchPage = useCallback(
    async (reset = false) => {
      if (!session?.access_token) return;
      if (loading || (!reset && !hasMore)) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (!reset && cursor) params.set("cursor", cursor);
        if (kindFilter) params.set("kind", kindFilter);
        if (danceOnly) params.set("category_prefix", "dance.");
        const res = await fetch(`${GATEWAY_URL}/community/open-asks?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.asks)) {
          setAsks((prev) => (reset ? data.asks : [...prev, ...data.asks]));
          setCursor(data.next_cursor ?? null);
          setHasMore(Boolean(data.next_cursor));
        } else {
          setHasMore(false);
        }
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [session, cursor, hasMore, loading, kindFilter, danceOnly]
  );

  useEffect(() => {
    setAsks([]);
    setCursor(null);
    setHasMore(true);
    void fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, danceOnly]);

  const summary = useMemo(() => {
    if (loading && asks.length === 0) return "Loading open asks…";
    if (asks.length === 0) return "No open asks yet — yours could be the first.";
    return `${asks.length} open ask${asks.length === 1 ? "" : "s"} — be the first to respond.`;
  }, [asks.length, loading]);

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{t('screens.community.openAsksCommunity')}</h1>
      </div>

      <p className="text-sm text-muted-foreground">{summary}</p>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">{t('screens.community.kind')}</span>
          {KIND_FILTERS.map((f) => (
            <button
              key={f.key ?? "all"}
              type="button"
              onClick={() => setKindFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-sm border transition-colors ${
                kindFilter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">{t('screens.community.topic')}</span>
          {DANCE_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setDanceOnly(Boolean(f.prefix))}
              className={`px-2.5 py-1 rounded-md text-sm border transition-colors ${
                danceOnly === Boolean(f.prefix)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {asks.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {danceOnly ? "No open dance asks yet — post yours and you're the first!" : "No open asks match this filter."}
        </div>
      )}

      <div className="space-y-2">
        {asks.map((a) => (
          <button
            key={a.intent_id}
            type="button"
            onClick={() => navigate(`/p/${a.intent_id}`)}
            className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                {KIND_LABEL[a.intent_kind] ?? a.intent_kind}
              </span>
              <span className="text-xs text-muted-foreground">{formatRelative(a.created_at)}</span>
            </div>
            <h3 className="font-medium leading-snug mb-1">{a.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.scope_excerpt}</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {a.requester_vitana_id && (
                <span className="text-primary/80">@{a.requester_vitana_id}</span>
              )}
              {a.category && (
                <span className="text-muted-foreground">· {a.category.replace(/_/g, " ")}</span>
              )}
              {a.kind_payload?.dance?.variety && (
                <span className="text-muted-foreground">· 💃 {a.kind_payload.dance.variety}</span>
              )}
              {a.kind_payload?.location_label && (
                <span className="text-muted-foreground">· 📍 {a.kind_payload.location_label}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" disabled={loading} onClick={() => fetchPage(false)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
