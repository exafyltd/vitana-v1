/**
 * Autopilot > Growth tab
 *
 * Impact metrics: total runs, success rate, time saved, per-automation
 * breakdown, and a daily trend chart.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRunsStats } from "@/hooks/useAdminAutopilot";
import { t } from '@/lib/i18n-toast';

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AutopilotGrowth() {
  const [days, setDays] = useState(30);
  const statsQuery = useRunsStats(days);
  const stats = statsQuery.data;

  return (
    <AppLayout>
      <AdminTabs sectionKey="autopilot" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📈"
          title={t('screens.admin.growthImpact')}
          description="Measure the value autopilot delivers to your community"
        />

        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>

        {statsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingStats')}</p>
        )}

        {statsQuery.isError && (
          <p className="text-sm text-destructive py-8 text-center">
            {(statsQuery.error as Error)?.message || "Failed to load stats"}
          </p>
        )}

        {stats && stats.total_runs === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noRunsThisPeriod')}
            description={`No autopilot runs recorded in the last ${days} days. Enable automations to start seeing impact data.`}
          />
        )}

        {stats && stats.total_runs > 0 && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('screens.admin.totalRuns')}</CardDescription>
                  <CardTitle className="text-2xl">{stats.total_runs}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('screens.admin.successRate')}</CardDescription>
                  <CardTitle className="text-2xl">
                    {stats.success_rate}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <AdminStatusBadge variant={stats.success_rate >= 90 ? "active" : stats.success_rate >= 70 ? "warning" : "error"}>
                    {stats.completed} completed · {stats.failed} failed
                  </AdminStatusBadge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('screens.admin.timeSaved')}</CardDescription>
                  <CardTitle className="text-2xl">{formatMinutes(stats.time_saved_minutes)}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs text-muted-foreground">{t('screens.admin.est15MinPerAutomation')}</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Period</CardDescription>
                  <CardTitle className="text-2xl">{stats.period_days}d</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs text-muted-foreground">
                    avg {(stats.total_runs / stats.period_days).toFixed(1)} runs/day
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Daily trend (simple bar chart via CSS) */}
            {stats.daily_trend.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('screens.admin.dailyActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-24">
                    {stats.daily_trend.map((d) => {
                      const maxCount = Math.max(...stats.daily_trend.map(t => t.count));
                      const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                      return (
                        <div
                          key={d.date}
                          className="flex-1 bg-primary/70 rounded-t hover:bg-primary transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${d.date}: ${d.count} runs`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>{stats.daily_trend[0]?.date}</span>
                    <span>{stats.daily_trend[stats.daily_trend.length - 1]?.date}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-automation breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('screens.admin.byAutomation')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Automation</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-center">Failed</TableHead>
                        <TableHead className="text-right">{t('screens.admin.avgDuration')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(stats.by_automation)
                        .sort(([, a], [, b]) => b.total - a.total)
                        .map(([id, entry]) => (
                          <TableRow key={id}>
                            <TableCell className="font-mono text-sm">{id}</TableCell>
                            <TableCell className="text-center">{entry.total}</TableCell>
                            <TableCell className="text-center text-green-600 dark:text-green-400">{entry.completed}</TableCell>
                            <TableCell className="text-center text-red-600 dark:text-red-400">{entry.failed}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {entry.avg_duration_ms > 0 ? `${(entry.avg_duration_ms / 1000).toFixed(1)}s` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
