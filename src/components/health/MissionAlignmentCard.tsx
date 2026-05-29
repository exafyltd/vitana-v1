/**
 * Mission Alignment summary card (Phase 6 of Ultimate Goal hardening).
 *
 * Renders on the Vitana Index Detail screen. Reads the user's current
 * autopilot recommendation queue and aggregates it across the three
 * contract dimensions defined in docs/GOVERNANCE/ULTIMATE-GOAL.md:
 *
 *   1. Pillar impact — which of the 5 longevity pillars the queue advances
 *   2. Economic axis — whether the longevity economy axis is represented
 *
 * Per-pillar bar colors match the Command Hub Mission Alignment panel so the
 * supervisor and the end user see consistent visual semantics for the same
 * concept.
 *
 * Data source: GET /api/v1/autopilot/recommendations (live in production via
 * vitana-platform PRs #2057 + #2060). pillar_impact is derived at read time
 * from contribution_vector by the gateway; economic_axis is labeled at insert
 * time by deriveEconomicAxis.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { communityFetch } from "@/lib/community-gateway";
import { t } from "@/lib/i18n-toast";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";

const PILLAR_ORDER: ReadonlyArray<VitanaPillarKey> = [
  "nutrition",
  "hydration",
  "exercise",
  "sleep",
  "mental",
];

const ECONOMIC_AXES = ["find_match", "marketplace", "income_generation", "business_formation"] as const;
type EconomicAxis = (typeof ECONOMIC_AXES)[number] | "none";

interface PillarImpact {
  primary_pillar: VitanaPillarKey | null;
  magnitude: "high" | "medium" | "low" | "none";
}

interface RecommendationRow {
  id: string;
  title?: string | null;
  economic_axis?: EconomicAxis | string | null;
  autonomy_level?: string | null;
  contribution_vector?: ContributionVector | null;
  pillar_impact?: PillarImpact | null;
}

interface AggregateBuckets {
  total: number;
  served: number;
  pillarCounts: Record<VitanaPillarKey | "none", number>;
  economyCounts: Record<EconomicAxis, number>;
}

const CONTRACT_URL = "https://github.com/exafyltd/vitana-platform/blob/main/docs/GOVERNANCE/ULTIMATE-GOAL.md";

function aggregate(rows: RecommendationRow[]): AggregateBuckets {
  const pillarCounts: AggregateBuckets["pillarCounts"] = {
    nutrition: 0,
    hydration: 0,
    exercise: 0,
    sleep: 0,
    mental: 0,
    none: 0,
  };
  const economyCounts: AggregateBuckets["economyCounts"] = {
    find_match: 0,
    marketplace: 0,
    income_generation: 0,
    business_formation: 0,
    none: 0,
  };
  let served = 0;

  rows.forEach((row) => {
    const pillar = row.pillar_impact?.primary_pillar ?? null;
    if (pillar && pillar in pillarCounts) {
      pillarCounts[pillar] += 1;
    } else {
      pillarCounts.none += 1;
    }
    const axisRaw = (row.economic_axis as string | null | undefined) ?? "none";
    const axis: EconomicAxis = (ECONOMIC_AXES as readonly string[]).includes(axisRaw)
      ? (axisRaw as EconomicAxis)
      : "none";
    economyCounts[axis] += 1;
    if (pillar || axis !== "none") served += 1;
  });

  return {
    total: rows.length,
    served,
    pillarCounts,
    economyCounts,
  };
}

interface BarRowProps {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}

function BarRow({ label, count, total, colorClass }: BarRowProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="grid grid-cols-[8rem_1fr_4.5rem] items-center gap-2 py-1.5 text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${colorClass}`}
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
      <span className="text-right tabular-nums text-foreground">
        {count} ({pct}%)
      </span>
    </div>
  );
}

const PILLAR_COLOR_CLASS: Record<VitanaPillarKey, string> = {
  nutrition: "bg-lime-500",
  hydration: "bg-sky-400",
  exercise: "bg-orange-500",
  sleep: "bg-purple-500",
  mental: "bg-pink-500",
};

export default function MissionAlignmentCard() {
  const [rows, setRows] = useState<RecommendationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    communityFetch("/api/v1/autopilot/recommendations?limit=200&status=new")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && Array.isArray(j.recommendations)) {
          setRows(j.recommendations as RecommendationRow[]);
        } else {
          setErrorKey(j?.error || "unknown_error");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorKey(err instanceof Error ? err.message : "fetch_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{t("screens.health.missionAlignment.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("screens.health.missionAlignment.subtitle")}
            </p>
          </div>
          <a
            href={CONTRACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("screens.health.missionAlignment.contractLink")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("screens.health.missionAlignment.loading")}
          </div>
        ) : errorKey ? (
          <p className="text-sm text-destructive">{t("screens.health.missionAlignment.error")}</p>
        ) : rows && rows.length > 0 ? (
          <MissionAlignmentBody rows={rows} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("screens.health.missionAlignment.noRecs")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MissionAlignmentBody({ rows }: { rows: RecommendationRow[] }) {
  const agg = aggregate(rows);
  const servedPct = agg.total > 0 ? Math.round((agg.served / agg.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <div className="font-medium text-foreground">
          {t("screens.health.missionAlignment.summaryServed", { pct: servedPct })}
        </div>
        <div className="mt-0.5 text-muted-foreground">
          {t("screens.health.missionAlignment.summaryServedCount", {
            served: agg.served,
            total: agg.total,
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("screens.health.missionAlignment.pillarHeading")}
        </h3>
        {PILLAR_ORDER.map((pillar) => (
          <BarRow
            key={pillar}
            label={t(`screens.health.missionAlignment.pillars.${pillar}`)}
            count={agg.pillarCounts[pillar]}
            total={agg.total}
            colorClass={PILLAR_COLOR_CLASS[pillar]}
          />
        ))}
        <BarRow
          label={t("screens.health.missionAlignment.noPillar")}
          count={agg.pillarCounts.none}
          total={agg.total}
          colorClass="bg-muted-foreground/40"
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("screens.health.missionAlignment.economyHeading")}
        </h3>
        {ECONOMIC_AXES.map((axis) => (
          <BarRow
            key={axis}
            label={t(`screens.health.missionAlignment.economyAxes.${axis}`)}
            count={agg.economyCounts[axis]}
            total={agg.total}
            colorClass="bg-amber-500"
          />
        ))}
        <BarRow
          label={t("screens.health.missionAlignment.noEconomy")}
          count={agg.economyCounts.none}
          total={agg.total}
          colorClass="bg-muted-foreground/40"
        />
      </div>
    </div>
  );
}
