/**
 * VTID-DANCE-D4: Public community members directory.
 *
 * The anti-loneliness primer: a new signup lands here and sees the whole
 * community at a glance. Each member card shows vitana_id + Member #N
 * badge + display_name + location + dance preview chip.
 *
 * Click a card → navigate to that user's profile page (existing).
 *
 * Route: /comm/members (and a /community/members alias).
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Users } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

type SortMode = "newest" | "oldest" | "name";

interface DancePreview {
  variety: string | null;
  level: string | null;
  role: string | null;
}

interface MemberRow {
  vitana_id: string | null;
  registration_seq: number | null;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  member_since: string | null;
  dance_preview: DancePreview | null;
}

const VARIETY_FILTERS = [
  { key: null, label: "All" },
  { key: "salsa", label: "Salsa" },
  { key: "tango", label: "Tango" },
  { key: "bachata", label: "Bachata" },
  { key: "kizomba", label: "Kizomba" },
  { key: "swing", label: "Swing" },
  { key: "ballroom", label: "Ballroom" },
  { key: "hiphop", label: "Hip-hop" },
];

function initialsFor(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || "?";
}

export default function Members() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sort, setSort] = useState<SortMode>("newest");
  const [search, setSearch] = useState("");
  const [danceFilter, setDanceFilter] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (reset = false) => {
      if (!session?.access_token) return;
      if (loading || (!reset && !hasMore)) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        params.set("sort", sort);
        if (!reset && cursor) params.set("cursor", cursor);
        if (danceFilter) params.set("dance", danceFilter);
        const res = await fetch(`${GATEWAY_URL}/community/members?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.members)) {
          setMembers((prev) => (reset ? data.members : [...prev, ...data.members]));
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
    [session, sort, cursor, hasMore, loading, danceFilter]
  );

  // Reset + reload when sort or filter changes.
  useEffect(() => {
    setMembers([]);
    setCursor(null);
    setHasMore(true);
    void fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, danceFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const name = (m.display_name || "").toLowerCase();
      const vid = (m.vitana_id || "").toLowerCase();
      return name.includes(q) || vid.includes(q);
    });
  }, [members, search]);

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{t('screens.community.communityMembers')}</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('screens.community.meetEveryoneVitanaCommunityTapCard')}
      </p>

      <div className="space-y-3">
        <Input
          placeholder={t('screens.community.searchByNameVitanaid')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search members"
        />

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">{t('screens.community.sort')}</span>
          {(["newest", "oldest", "name"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`px-2.5 py-1 rounded-md text-sm border transition-colors ${
                sort === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              }`}
            >
              {s === "newest" ? "Newest" : s === "oldest" ? "Founders first" : "By name"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">{t('screens.community.dance')}</span>
          {VARIETY_FILTERS.map((f) => (
            <button
              key={f.key ?? "all"}
              type="button"
              onClick={() => setDanceFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-sm border transition-colors ${
                danceFilter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {danceFilter
            ? `Nobody has set ${danceFilter} as a dance preference yet — be the first!`
            : "No members yet."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m) => (
          <button
            key={m.vitana_id ?? `${m.registration_seq}`}
            type="button"
            onClick={() => m.vitana_id && navigate(`/profile/${m.vitana_id}`)}
            className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <Avatar className="h-12 w-12 flex-shrink-0">
              {m.avatar_url ? <AvatarImage src={m.avatar_url} alt={m.display_name ?? ""} /> : null}
              <AvatarFallback>{initialsFor(m.display_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-medium truncate">{m.display_name ?? "Member"}</span>
                {m.vitana_id && (
                  <span className="text-sm text-muted-foreground">@{m.vitana_id}</span>
                )}
                {m.registration_seq != null && (
                  <span className="text-[11px] uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                    Member #{m.registration_seq}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {m.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {m.location}
                  </span>
                )}
                {m.dance_preview && m.dance_preview.variety && (
                  <span className="inline-flex items-center gap-1 text-foreground/80">
                    {[m.dance_preview.variety, m.dance_preview.level, m.dance_preview.role]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => fetchPage(false)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
