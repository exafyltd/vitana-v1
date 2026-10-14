/**
 * VTID-05172 — the Memory overview's "your week in the Vitana Index": score,
 * the 7-day change, which pillars rose or slipped, the balance in plain words,
 * and the way into the timeline. Same gateway spotlight as the timeline.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VCard, VCardSkeleton } from "@/components/ui/vcard";
import { useTimelineSpotlight } from "@/hooks/useTimeline";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { t } from "@/lib/i18n-toast";
import { fmtNumber } from "@/lib/locale-format";
import { PILLAR_KEYS } from "@/lib/timeline-api";
import { signed, tierLabel } from "@/components/timeline/timeline-meta";

export function IndexWeekStory() {
  const { data, isLoading } = useTimelineSpotlight();
  if (isLoading) return <VCardSkeleton size="standard" />;
  if (!data) {
    return (
      <VCard
        size="standard"
        data-testid="memory-week-empty"
        eyebrow={<span className="inline-flex items-center gap-1.5"><Gauge className="h-4 w-4" aria-hidden />{t("memoryLearning.week.title")}</span>}
        title={t("memoryLearning.week.empty")}
        actions={<Button asChild size="sm"><Link to="/health/vitana-index">{t("memoryLearning.week.start")}</Link></Button>}
      />
    );
  }
  const rising = PILLAR_KEYS.filter((p) => data.pillars[p]?.momentum === "rising").map(pillarLabel);
  const slipping = PILLAR_KEYS.filter((p) => data.pillars[p]?.momentum === "slipping").map(pillarLabel);
  const weakest = data.balance.weakest_pillar ?? data.weakest_pillar;
  const balance =
    data.balance.penalty_pct > 0 && weakest
      ? t("timeline.balance.held_back", { pillar: pillarLabel(weakest), pct: fmtNumber(data.balance.penalty_pct) })
      : t("timeline.balance.full");
  const change = typeof data.change_7d === "number" && data.change_7d !== 0
    ? t("memoryLearning.week.change", { delta: signed(data.change_7d) })
    : t("memoryLearning.week.noChange");

  return (
    <VCard
      size="standard"
      data-testid="memory-week-story"
      eyebrow={<span className="inline-flex items-center gap-1.5"><Gauge className="h-4 w-4" aria-hidden />{t("memoryLearning.week.title")}</span>}
      title={
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-2xl font-bold tabular-nums">{fmtNumber(data.score_total)}</span>
          <span className="text-sm font-medium text-muted-foreground">{tierLabel(data.tier)} · {change}</span>
        </span>
      }
      body={
        <ul className="space-y-1 text-sm">
          {rising.length > 0 && <li data-testid="memory-week-rising">{t("memoryLearning.week.rising", { pillars: rising.join(", ") })}</li>}
          {slipping.length > 0 && <li data-testid="memory-week-slipping">{t("memoryLearning.week.slipping", { pillars: slipping.join(", ") })}</li>}
          {rising.length === 0 && slipping.length === 0 && <li>{t("memoryLearning.week.steady")}</li>}
          <li className="text-muted-foreground">{balance}</li>
        </ul>
      }
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/memory/timeline" data-testid="memory-week-open-timeline">
            {t("memoryLearning.week.openTimeline")}
            <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
      }
    />
  );
}
