/**
 * Mission Opportunities card — Phase 6 surface 3 of the Ultimate Goal
 * hardening (see docs/GOVERNANCE/ULTIMATE-GOAL.md in vitana-platform).
 *
 * Renders on the Business Hub Overview > Snapshot tab. Reads the live
 * /api/v1/autopilot/recommendations endpoint and filters down to recs
 * tagged with a non-'none' economic_axis. These are the recommendations
 * that advance the longevity economy axis: Find a Match, Marketplace,
 * Income generation, Business formation.
 *
 * Unlike the health-side Mission Alignment card (which aggregates the
 * whole queue across pillars + economy), this card surfaces actionable
 * opportunities directly — a short list of titles + axis badges that
 * the user can scan and activate from the recommendations popup.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { communityFetch } from "@/lib/community-gateway";
import { t } from "@/lib/i18n-toast";

const ECONOMIC_AXES = ["find_match", "marketplace", "income_generation", "business_formation"] as const;
type EconomicAxis = (typeof ECONOMIC_AXES)[number];

interface RecommendationRow {
  id: string;
  title?: string | null;
  summary?: string | null;
  economic_axis?: string | null;
  status?: string | null;
}

const AXIS_BADGE_CLASS: Record<EconomicAxis, string> = {
  find_match: "bg-violet-500/15 text-violet-600 border-violet-500/40",
  marketplace: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  income_generation: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
  business_formation: "bg-sky-500/15 text-sky-600 border-sky-500/40",
};

function isEconomicAxis(value: string | null | undefined): value is EconomicAxis {
  return !!value && (ECONOMIC_AXES as readonly string[]).includes(value);
}

export function MissionOpportunitiesCard() {
  const [rows, setRows] = useState<RecommendationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasError(false);
    communityFetch("/api/v1/autopilot/recommendations?limit=100&status=new")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && Array.isArray(j.recommendations)) {
          const economic = (j.recommendations as RecommendationRow[]).filter((r) =>
            isEconomicAxis(r.economic_axis),
          );
          setRows(economic);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("screens.business.missionOpportunities.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("screens.business.missionOpportunities.loading")}
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("screens.business.missionOpportunities.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">
          {t("screens.business.missionOpportunities.error")}
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("screens.business.missionOpportunities.title")}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("screens.business.missionOpportunities.subtitle")}
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("screens.business.missionOpportunities.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("screens.business.missionOpportunities.title")}
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("screens.business.missionOpportunities.subtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rows.slice(0, 5).map((rec) => {
            const axis = isEconomicAxis(rec.economic_axis) ? rec.economic_axis : "marketplace";
            return (
              <li
                key={rec.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{rec.title || ""}</p>
                  {rec.summary && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{rec.summary}</p>
                  )}
                </div>
                <Badge variant="outline" className={`shrink-0 text-[10px] ${AXIS_BADGE_CLASS[axis]}`}>
                  {t(`screens.business.missionOpportunities.axisBadge.${axis}`)}
                </Badge>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex justify-end">
          <Link
            to="/autopilot"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("screens.business.missionOpportunities.viewAll")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
