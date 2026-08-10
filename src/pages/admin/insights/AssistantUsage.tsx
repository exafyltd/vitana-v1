/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: Assistant usage analytics
 * (/admin/insights/assistant-usage).
 *
 * Conversation KPIs, funnel, outcome/feedback splits, top intents/topics,
 * tool reliability, and the recent-unresolved queue. Data:
 * useAdminAssistantAnalytics + useAdminAnalyticsSummary (gateway product
 * analytics endpoints). Charted (VTID-03567): outcome + feedback donuts,
 * ranked intent/topic bars.
 *
 * Privacy: everything here is metadata/aggregate — raw conversation text is
 * never stored in the analytics pipeline, so it cannot appear here.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAdminAssistantAnalytics,
  useAdminAnalyticsSummary,
} from "@/hooks/useAdminProductAnalytics";
import {
  AnalyticsStates,
  DaysSelect,
  KpiCard,
  PrivacyNote,
  pct,
} from "@/components/admin/analytics/AnalyticsShared";
import { BarListCard, DonutCard } from "@/components/admin/analytics/AnalyticsCharts";
import { fmtNumber, formatDistanceToNow } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function AssistantUsage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminAssistantAnalytics(days);
  const { data: summary } = useAdminAnalyticsSummary(days);

  const isEmpty = !!data && data.conversations === 0 && data.messages === 0;

  const resolved = data ? Math.round(data.resolution_rate * data.conversations) : 0;
  const abandoned = data ? Math.round(data.abandonment_rate * data.conversations) : 0;
  const openConvos = data ? Math.max(0, data.conversations - resolved - abandoned) : 0;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="🤖"
          title={t("screens.admin.assistantUsage")}
          description={t("screens.admin.paAssistantUsageDesc")}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label={t("screens.admin.paConversations")} value={data.conversations} />
              <KpiCard label={t("screens.admin.paAssistantUsers")} value={data.users} />
              <KpiCard label={t("screens.admin.paMessages")} value={data.messages} />
              <KpiCard label={t("screens.admin.paResolutionRate")} value={pct(data.resolution_rate)} />
              <KpiCard label={t("screens.admin.paAbandonmentRate")} value={pct(data.abandonment_rate)} />
              <KpiCard label={t("screens.admin.paNegativeFeedback")} value={data.negative_feedback} />
              <KpiCard
                label={t("screens.admin.paP95ResponseTime")}
                value={data.p95_response_ms == null ? "—" : `${fmtNumber(Math.round(data.p95_response_ms))} ms`}
              />
              <KpiCard label={t("screens.admin.paToolFailureRate")} value={pct(data.tool_failure_rate)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DonutCard
                title={t("screens.admin.paResolutionSplit")}
                segments={[
                  { label: t("screens.admin.paFunnelResolved"), value: resolved, colorIndex: 2 },
                  { label: t("screens.admin.paAbandoned"), value: abandoned, colorIndex: 1 },
                  { label: t("screens.admin.paOpenConversations"), value: openConvos, colorIndex: 0 },
                ]}
                centerValue={fmtNumber(data.conversations)}
                centerLabel={t("screens.admin.paConversations")}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <DonutCard
                title={t("screens.admin.paFeedbackSplit")}
                segments={[
                  { label: t("screens.admin.paPositive"), value: data.positive_feedback, colorIndex: 2 },
                  { label: t("screens.admin.paNegative"), value: data.negative_feedback, colorIndex: 1 },
                ]}
                centerValue={fmtNumber(data.positive_feedback + data.negative_feedback)}
                centerLabel={t("screens.admin.paFeedbackTotal")}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            {/* Funnel: conversations → messages → recommendation clicks → resolved */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paAssistantFunnel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-4">
                  <KpiCard label={t("screens.admin.paConversations")} value={data.conversations} />
                  <KpiCard label={t("screens.admin.paMessages")} value={data.messages} />
                  <KpiCard
                    label={t("screens.admin.paFunnelRecommendationClicks")}
                    value={summary?.recommendation_clicks ?? 0}
                  />
                  <KpiCard label={t("screens.admin.paFunnelResolved")} value={resolved} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <BarListCard
                title={t("screens.admin.paTopIntents")}
                rows={data.top_intents.map((i) => ({ label: i.intent, count: i.count }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <BarListCard
                title={t("screens.admin.paTopTopics")}
                colorIndex={2}
                rows={data.top_topics.map((i) => ({ label: i.topic, count: i.count }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            {/* Tool usage & failures */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paToolUsage")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {data.top_tools.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">{t("screens.admin.noAnalyticsData")}</p>
                ) : (
                  <div className="space-y-1">
                    {data.top_tools.map((tool) => (
                      <div
                        key={tool.tool_name}
                        className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                      >
                        <span className="font-mono">{tool.tool_name}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {t("screens.admin.paCalls")}: {fmtNumber(tool.calls)}
                          </Badge>
                          <Badge variant={tool.failures > 0 ? "destructive" : "outline"}>
                            {t("screens.admin.paFailures")}: {fmtNumber(tool.failures)}
                          </Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent unresolved conversations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paRecentUnresolved")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {data.recent_unresolved.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">{t("screens.admin.noAnalyticsData")}</p>
                ) : (
                  <div className="space-y-2">
                    {data.recent_unresolved.map((convo) => (
                      <div key={convo.conversation_id} className="rounded border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {convo.conversation_id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(convo.last_event_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {convo.topic && <Badge variant="outline">{t("screens.admin.paTopic")}: {convo.topic}</Badge>}
                          {convo.intent && <Badge variant="outline">{t("screens.admin.paIntent")}: {convo.intent}</Badge>}
                          <Badge variant="secondary">
                            {t("screens.admin.paMessages")}: {fmtNumber(convo.message_count)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <PrivacyNote textKey="screens.admin.analyticsPrivacyNote" />
          </>
        )}
      </div>
    </AppLayout>
  );
}
