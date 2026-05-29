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

const KIND_LABEL_KEY: Record<string, string> = {
  commercial_buy: 'screens.community.openAsksKind_commercialBuy',
  commercial_sell: 'screens.community.openAsksKind_commercialSell',
  activity_seek: 'screens.community.openAsksKind_activitySeek',
  partner_seek: 'screens.community.openAsksKind_partnerSeek',
  social_seek: 'screens.community.openAsksKind_socialSeek',
  mutual_aid: 'screens.community.openAsksKind_mutualAid',
  learning_seek: 'screens.community.openAsksKind_learningSeek',
  mentor_seek: 'screens.community.openAsksKind_mentorSeek',
};

const KIND_FILTERS = [
  { key: null as string | null, labelKey: 'screens.community.openAsksFilter_all' },
  { key: 'learning_seek', labelKey: 'screens.community.openAsksKind_learningSeek' },
  { key: 'mentor_seek', labelKey: 'screens.community.openAsksKind_mentorSeek' },
  { key: 'activity_seek', labelKey: 'screens.community.openAsksKind_activity' },
  { key: 'commercial_buy', labelKey: 'screens.community.openAsksKind_commercialBuy' },
  { key: 'commercial_sell', labelKey: 'screens.community.openAsksKind_commercialSell' },
  { key: 'social_seek', labelKey: 'screens.community.openAsksKind_socialSeek' },
  { key: 'mutual_aid', labelKey: 'screens.community.openAsksKind_mutualAid' },
];

const DANCE_FILTERS = [
  { prefix: null as string | null, labelKey: 'screens.community.openAsksDance_everything' },
  { prefix: 'dance.', labelKey: 'screens.community.openAsksDance_only' },
];

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - ts) / 1000;
  if (diff < 60) return t('screens.community.openAsksTime_justNow');
  if (diff < 3600) return t('screens.community.openAsksTime_minutes', { n: String(Math.floor(diff / 60)) });
  if (diff < 86400) return t('screens.community.openAsksTime_hours', { n: String(Math.floor(diff / 3600)) });
  return t('screens.community.openAsksTime_days', { n: String(Math.floor(diff / 86400)) });
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
    if (loading && asks.length === 0) return t('screens.community.openAsksSummary_loading');
    if (asks.length === 0) return t('screens.community.openAsksSummary_empty');
    return t('screens.community.openAsksSummary_count', { n: String(asks.length) });
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
              {t(f.labelKey)}
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
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {asks.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {danceOnly ? t('screens.community.openAsksEmpty_dance') : t('screens.community.openAsksEmpty_filter')}
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
                {KIND_LABEL_KEY[a.intent_kind] ? t(KIND_LABEL_KEY[a.intent_kind]) : a.intent_kind}
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('screens.community.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
