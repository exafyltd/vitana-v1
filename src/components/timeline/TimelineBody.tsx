/**
 * VTID-05170 — Life Timeline P4: the timeline itself, shared by the desktop
 * Spotlight frame and the mobile layout. The Vitana Index leads; pillar chips
 * filter; each day shows its Index change, its digest and its moments.
 * One query (gateway /api/v1/timeline), no realtime fan-out.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarSearch, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VCardSkeleton } from "@/components/ui/vcard";
import { Chip, ChipBar } from "@/components/discover/spotlight/DiscoverChips";
import { useTimeline, useTimelineSpotlight } from "@/hooks/useTimeline";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import { PILLAR_KEYS, type PillarKey, type TimelineItem } from "@/lib/timeline-api";
import { IndexSpotlightCard } from "./IndexSpotlightCard";
import { DigestRow, IndexDayRow, MomentRow } from "./TimelineRows";
import { TimelineDetailSheet } from "./TimelineDetailSheet";
import { LIFE_CATEGORIES, PILLAR_STYLE } from "./timeline-meta";

function localDay(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayOf(item: TimelineItem): string {
  return item.kind === "moment" ? localDay(item.at) : item.date;
}

function dayHeading(day: string): string {
  const today = localDay(new Date().toISOString());
  const yesterday = localDay(new Date(Date.now() - 86_400_000).toISOString());
  if (day === today) return t("timeline.day.today");
  if (day === yesterday) return t("timeline.day.yesterday");
  return fmtDate(`${day}T12:00:00`, { weekday: "long", day: "numeric", month: "long" });
}

/** End of the member's chosen local day, as the UTC instant the API filters on. */
export function localDayEndIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString();
}

export function TimelineBody({ searchTerm, onClearSearch }: { searchTerm?: string; onClearSearch?: () => void }) {
  const [pillar, setPillar] = useState<PillarKey | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [query, setQuery] = useState("");
  const [jumpTo, setJumpTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const q = (searchTerm ?? query).trim();

  const filters = useMemo(
    () => ({
      pillar,
      category,
      q: q.length >= 2 ? q : null,
      to: jumpTo ? localDayEndIso(jumpTo) : null,
    }),
    [pillar, category, q, jumpTo],
  );
  const spotlight = useTimelineSpotlight();
  const list = useTimeline(filters);

  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [list.hasNextPage, list.isFetchingNextPage, list.fetchNextPage, list]);

  const days = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const it of list.items) {
      const d = dayOf(it);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(it);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [list.items]);

  const filtered = !!(pillar || category || filters.q || jumpTo);

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="timeline-body">
      {spotlight.isLoading ? (
        <VCardSkeleton size="standard" />
      ) : spotlight.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-vcard border border-dashed p-4" data-testid="timeline-spotlight-error">
          <p className="text-sm text-muted-foreground">{t("timeline.spotlight.error")}</p>
          <Button variant="outline" size="sm" onClick={() => void spotlight.refetch()}>
            <RefreshCw className="me-1.5 h-4 w-4" aria-hidden />
            {t("timeline.retry")}
          </Button>
        </div>
      ) : spotlight.data ? (
        <IndexSpotlightCard spotlight={spotlight.data} />
      ) : (
        <p className="rounded-vcard border border-dashed p-4 text-sm text-muted-foreground" data-testid="timeline-no-index">
          {t("timeline.spotlight.empty")}{" "}
          <Link to="/health/vitana-index" className="font-medium text-primary hover:underline">
            {t("timeline.spotlight.start")}
          </Link>
        </p>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <ChipBar ariaLabel={t("timeline.filters.pillarsLabel")}>
          <Chip active={!pillar && !category} onClick={() => { setPillar(null); setCategory(null); }}>
            {t("timeline.filters.all")}
          </Chip>
          {PILLAR_KEYS.map((p) => {
            const Icon = PILLAR_STYLE[p].icon;
            return (
              <Chip key={p} active={pillar === p} onClick={() => { setCategory(null); setPillar(pillar === p ? null : p); }}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${pillar === p ? "" : PILLAR_STYLE[p].accent}`} aria-hidden />
                  {pillarLabel(p)}
                </span>
              </Chip>
            );
          })}
          <Chip active={showMore || !!category} onClick={() => setShowMore((v) => !v)}>
            {t("timeline.filters.more")}
          </Chip>
        </ChipBar>
        {(showMore || category) && (
          <ChipBar ariaLabel={t("timeline.filters.categoriesLabel")}>
            {LIFE_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => { setPillar(null); setCategory(category === c ? null : c); }}>
                {t(`timeline.category.${c}`)}
              </Chip>
            ))}
          </ChipBar>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {searchTerm === undefined && (
            <label className="relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute start-3 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("timeline.searchPlaceholder")}
                aria-label={t("timeline.searchPlaceholder")}
                className="ps-9"
                data-testid="timeline-search"
              />
            </label>
          )}
          <label className="relative flex items-center">
            <CalendarSearch className="pointer-events-none absolute start-3 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              type="date"
              value={jumpTo}
              max={localDay(new Date().toISOString())}
              onChange={(e) => setJumpTo(e.target.value)}
              aria-label={t("timeline.jumpToDate")}
              className="ps-9"
              data-testid="timeline-jump"
            />
          </label>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => { setPillar(null); setCategory(null); setQuery(""); setJumpTo(""); onClearSearch?.(); }}>
              <X className="me-1 h-4 w-4" aria-hidden />
              {t("timeline.filters.clear")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground" data-testid="timeline-transparency">
          {t("timeline.transparency")}{" "}
          <Link to="/memory/permissions" className="font-medium text-primary hover:underline">
            {t("timeline.transparencyLink")}
          </Link>
        </p>
      </div>

      {list.isLoading ? (
        <ul className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <VCardSkeleton key={i} size="row" />)}
        </ul>
      ) : list.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-vcard border border-dashed p-4" data-testid="timeline-error">
          <p className="text-sm text-muted-foreground">{t("timeline.error")}</p>
          <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
            <RefreshCw className="me-1.5 h-4 w-4" aria-hidden />
            {t("timeline.retry")}
          </Button>
        </div>
      ) : days.length === 0 ? (
        <p className="rounded-vcard border border-dashed p-6 text-center text-sm text-muted-foreground" data-testid="timeline-empty">
          {t(filtered ? "timeline.emptyFiltered" : "timeline.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map(([day, items]) => (
            <section key={day} aria-label={dayHeading(day)} data-testid="timeline-day">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dayHeading(day)}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((it) =>
                  it.kind === "moment" ? (
                    <MomentRow key={it.id} item={it} onOpen={setOpenId} />
                  ) : it.kind === "index_day" ? (
                    <IndexDayRow key={it.id} item={it} />
                  ) : (
                    <DigestRow key={it.id} item={it} />
                  ),
                )}
              </ul>
            </section>
          ))}
          <div ref={sentinel} aria-hidden />
          {list.isFetchingNextPage && <VCardSkeleton size="row" />}
        </div>
      )}

      <TimelineDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
