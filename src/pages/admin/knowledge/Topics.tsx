/**
 * Knowledge > Topics tab
 *
 * Lists distinct topic tags from the KB. Simple grid of topic pills.
 * Thin v1 — read-only.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useKBTopics, useKBDocuments } from "@/hooks/useAdminKnowledge";
import { t } from '@/lib/i18n-toast';

export default function KnowledgeTopics() {
  const topicsQuery = useKBTopics();
  const docsQuery = useKBDocuments();

  const topics = topicsQuery.data || [];
  const docs = docsQuery.data || [];

  // Count docs per topic
  const topicCounts: Record<string, number> = {};
  for (const topic of topics) {
    topicCounts[topic] = docs.filter((d) => d.topics?.includes(topic)).length;
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🏷️"
          title={t('screens.admin.knowledgeTopics')}
          description="All topic tags used across your knowledge base documents."
        />

        {topicsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingTopics')}</p>
        )}

        {!topicsQuery.isLoading && topics.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noTopicsFound')}
            description="Topics will appear here once documents are tagged."
          />
        )}

        {topics.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                {topics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center gap-2 bg-muted/50 border rounded-full px-4 py-2"
                  >
                    <span className="text-sm font-medium">{topic}</span>
                    <Badge variant="secondary" className="text-xs">
                      {topicCounts[topic] || 0}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {topics.length} topic{topics.length !== 1 ? "s" : ""} across {docs.length} document{docs.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
