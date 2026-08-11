/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: User interest analytics
 * (/admin/insights/interests).
 *
 * Detected topics with user/event/repeat counts, a per-source breakdown
 * (assistant, web, orb…), and a suggested product action per topic.
 * Data: useAdminInterestAnalytics. Charted (VTID-03567): ranked topic bars,
 * per-source stacks.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminInterestAnalytics } from "@/hooks/useAdminProductAnalytics";
import {
  AnalyticsStates,
  DaysSelect,
  KpiCard,
  PrivacyNote,
} from "@/components/admin/analytics/AnalyticsShared";
import { BarListCard, StackedBarListCard } from "@/components/admin/analytics/AnalyticsCharts";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

interface TopicRow {
  topic: string;
  users: number;
  events: number;
  repeated_users: number;
}

// Stable source order so a filter change never repaints surviving series.
const SOURCE_ORDER = ["assistant", "orb", "web", "ios", "android", "gateway"] as const;

function suggestedAction(
  topic: TopicRow,
  sources: Array<{ topic: string; source: string; events: number }>,
): string {
  if (topic.users > 0 && topic.repeated_users / topic.users >= 0.3) {
    return t("screens.admin.paSuggestionHighRepeat");
  }
  const topicSources = sources.filter((s) => s.topic === topic.topic);
  const assistantEvents = topicSources
    .filter((s) => s.source === "assistant" || s.source === "orb")
    .reduce((sum, s) => sum + s.events, 0);
  if (topic.events > 0 && assistantEvents / topic.events >= 0.5) {
    return t("screens.admin.paSuggestionAssistantHeavy");
  }
  return t("screens.admin.paSuggestionGeneral");
}

export default function Interests() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminInterestAnalytics(days);

  const isEmpty = !!data && data.top_topics.length === 0;
  const repeatedUsersTotal = (data?.top_topics ?? []).reduce((sum, t2) => sum + t2.repeated_users, 0);

  // Only sources actually present in the window get a series slot.
  const presentSources = SOURCE_ORDER.filter((src) =>
    (data?.topic_sources ?? []).some((s) => s.source === src && s.events > 0),
  );
  const sourceRows = (data?.top_topics ?? []).map((topic) => ({
    label: topic.topic,
    values: presentSources.map((src) =>
      (data?.topic_sources ?? [])
        .filter((s) => s.topic === topic.topic && s.source === src)
        .reduce((sum, s) => sum + s.events, 0),
    ),
  }));

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="💡"
          title={t("screens.admin.paUserInterests")}
          description={t("screens.admin.paInterestsDesc")}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <KpiCard label={t("screens.admin.paDetectedTopics")} value={data.top_topics.length} />
              <KpiCard label={t("screens.admin.paRepeatedInterestUsers")} value={repeatedUsersTotal} />
              <KpiCard label={t("screens.admin.paTopTopic")} value={data.top_topics[0]?.topic ?? "—"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <BarListCard
                title={t("screens.admin.paTopTopics")}
                rows={data.top_topics.map((topic) => ({
                  label: topic.topic,
                  count: topic.events,
                  extra: (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {t("screens.admin.paUsers")}: {fmtNumber(topic.users)}
                    </Badge>
                  ),
                }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <StackedBarListCard
                title={t("screens.admin.paTopicSources")}
                rows={sourceRows}
                series={presentSources.map((src) => ({ key: src, label: src }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            {/* Top topics with decision prompts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paSuggestedAction")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  {data.top_topics.slice(0, 10).map((topic) => (
                    <div key={topic.topic} className="rounded border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium">{topic.topic}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant="secondary">
                            {t("screens.admin.paUsers")}: {fmtNumber(topic.users)}
                          </Badge>
                          <Badge variant="secondary">
                            {t("screens.admin.paEvents")}: {fmtNumber(topic.events)}
                          </Badge>
                          <Badge variant="outline">
                            {t("screens.admin.paRepeatUsers")}: {fmtNumber(topic.repeated_users)}
                          </Badge>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {suggestedAction(topic, data.topic_sources)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
