/**
 * VTID-05170 — the Vitana Index at the top of the timeline: score, tier,
 * today's change, the five pillars as bars (0–200) with today's change and
 * 7-day momentum, the balance in plain words, and the weakest pillar with
 * one action. Every number comes from the gateway (recorded movements and
 * vitana_index_scores); nothing is estimated here.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Gauge, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { VCard } from "@/components/ui/vcard";
import { t } from "@/lib/i18n-toast";
import { fmtNumber } from "@/lib/locale-format";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { PILLAR_KEYS, type TimelineSpotlight } from "@/lib/timeline-api";
import { PILLAR_STYLE, signed, tierLabel } from "./timeline-meta";

const MAX_PILLAR = 200;

function Momentum({ m }: { m: "rising" | "steady" | "slipping" | "unknown" }) {
  if (m === "rising") return <TrendingUp className="h-3.5 w-3.5 text-status-success" aria-label={t("timeline.momentum.rising")} />;
  if (m === "slipping") return <TrendingDown className="h-3.5 w-3.5 text-status-warning" aria-label={t("timeline.momentum.slipping")} />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-label={t("timeline.momentum.steady")} />;
}

export function IndexSpotlightCard({ spotlight }: { spotlight: TimelineSpotlight }) {
  const weakest = spotlight.balance.weakest_pillar ?? spotlight.weakest_pillar;
  const balanceText =
    spotlight.balance.penalty_pct > 0 && weakest
      ? t("timeline.balance.held_back", { pillar: pillarLabel(weakest), pct: fmtNumber(spotlight.balance.penalty_pct) })
      : t("timeline.balance.full");

  return (
    <VCard
      size="standard"
      data-testid="timeline-index-spotlight"
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-4 w-4" aria-hidden />
          {t("timeline.spotlight.eyebrow")}
        </span>
      }
      title={
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold tabular-nums">{fmtNumber(spotlight.score_total)}</span>
          <span className="text-sm text-muted-foreground">{tierLabel(spotlight.tier)}</span>
          {spotlight.change_today !== 0 && (
            <span className={spotlight.change_today > 0 ? "text-sm text-status-success" : "text-sm text-status-warning"}>
              {t("timeline.spotlight.today", { delta: signed(spotlight.change_today) })}
            </span>
          )}
        </span>
      }
      meta={balanceText}
      body={
        <div className="space-y-3">
          <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2" aria-label={t("timeline.spotlight.pillarsLabel")}>
            {PILLAR_KEYS.map((p) => {
              const row = spotlight.pillars[p];
              const style = PILLAR_STYLE[p];
              const Icon = style.icon;
              const pct = Math.max(0, Math.min(100, Math.round((row.score / MAX_PILLAR) * 100)));
              return (
                <li key={p} className="contents" data-testid={`timeline-pillar-${p}`}>
                  <span className={`inline-flex min-w-0 items-center gap-1.5 text-sm ${style.accent}`}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate text-foreground">{pillarLabel(p)}</span>
                  </span>
                  <span className={`h-2 overflow-hidden rounded-full ${style.tint}`} aria-hidden>
                    <span className={`block h-full rounded-full ${style.bar}`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    {fmtNumber(row.score)}
                    {row.change_today !== 0 && (
                      <span className={row.change_today > 0 ? "text-status-success" : "text-status-warning"}>{signed(row.change_today)}</span>
                    )}
                    <Momentum m={row.momentum} />
                  </span>
                </li>
              );
            })}
          </ul>
          {weakest && (
            <Link
              to="/health/vitana-index"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              data-testid="timeline-weakest-action"
            >
              {t("timeline.spotlight.improve", { pillar: pillarLabel(weakest) })}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          )}
        </div>
      }
    />
  );
}
