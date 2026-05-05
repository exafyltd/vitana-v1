/**
 * VTID-NAV-02: Admin Navigator — Telemetry view.
 *
 * Aggregates orb.navigator.* OASIS events from the last 30 days and
 * surfaces:
 *   - event counts by type
 *   - top firing screens
 *   - failed utterances (confidence='low')
 *   - near-misses (top score - runner-up score <= 4)
 *
 * Near-miss rows are linkable: clicking one takes the admin back to
 * /admin/navigator with the runner-up screen preselected and the
 * utterance pre-loaded in the simulator so they can fix the routing
 * issue in one click.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminNavigatorNavigation } from "@/config/navigation";
import { useNavTelemetry } from "@/hooks/useAdminNavigator";
import { t } from '@/lib/i18n-toast';

export default function NavigatorTelemetry() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useNavTelemetry(days);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="📊"
          title={t('screens.admin.navigatorTelemetry')}
          description="What Vitana actually decided in real sessions. Use the failed utterances and near-misses lists to discover which triggers to tune."
          rightAction={
            <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('screens.admin.last7Days')}</SelectItem>
                <SelectItem value="30">{t('screens.admin.last30Days')}</SelectItem>
                <SelectItem value="90">{t('screens.admin.last90Days')}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SubNavigation items={adminNavigatorNavigation} />

        {isLoading && <p className="text-sm text-muted-foreground">{t('screens.admin.loadingTelemetry')}</p>}
        {error && (
          <p className="text-sm text-destructive">{(error as Error)?.message || "Failed to load"}</p>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.totalEvents2')}</div>
                  <div className="text-2xl font-bold">{data.event_count}</div>
                </CardContent>
              </Card>
              {Object.entries(data.by_type).map(([t, c]) => (
                <Card key={t}>
                  <CardContent className="p-4">
                    <div className="truncate text-xs uppercase text-muted-foreground">
                      {t.replace("orb.navigator.", "")}
                    </div>
                    <div className="text-2xl font-bold">{c}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {/* Top firing screens */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.admin.topFiringScreens')}</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  {data.top_screens.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">{t('screens.admin.noScreenFiringsRecorded')}</p>
                  ) : (
                    <div className="space-y-1">
                      {data.top_screens.map((s) => (
                        <div
                          key={s.screen_id}
                          className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                        >
                          <span className="font-mono">{s.screen_id}</span>
                          <Badge variant="secondary">{s.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Near-misses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.admin.nearmisses4')}</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  {data.near_misses.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">{t('screens.admin.noCloseDecisionsWindow')}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.near_misses.map((nm, i) => {
                        const picked = nm.picked as any;
                        const runnerUp = nm.runner_up as any;
                        return (
                          <Link
                            key={i}
                            to="/admin/navigator"
                            className="block rounded border px-3 py-2 text-sm hover:bg-muted"
                          >
                            <div className="mb-1 italic text-muted-foreground">"{nm.utterance}"</div>
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                {t('screens.admin.picked')} <span className="font-mono">{picked?.screen_id}</span>{" "}
                                <span className="text-muted-foreground">({picked?.score})</span>
                              </span>
                              <span>
                                {t('screens.admin.runnerup')} <span className="font-mono">{runnerUp?.screen_id}</span>{" "}
                                <span className="text-muted-foreground">({runnerUp?.score})</span>
                              </span>
                              <Badge variant="outline">δ {nm.delta}</Badge>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Failed utterances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('screens.admin.failedUtterancesLowConfidence')}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {data.failed_utterances.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No low-confidence consults in window.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {data.failed_utterances.map((f, i) => (
                      <div key={i} className="rounded border bg-muted/20 px-3 py-2 text-sm">
                        <span className="italic">"{f.utterance}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
