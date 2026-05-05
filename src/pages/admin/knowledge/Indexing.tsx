/**
 * Knowledge > Indexing tab
 *
 * Shows KB documents grouped by indexing status.
 * Failed docs have a retry button. Thin v1.
 */

import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useKBDocuments, useReindexKBDocument } from "@/hooks/useAdminKnowledge";
import { notifySuccess } from '@/lib/i18n-toast';

const STATUS_ORDER = ["failed", "pending", "indexed"] as const;

export default function KnowledgeIndexing() {
  const docsQuery = useKBDocuments();
  const reindexMutation = useReindexKBDocument();
  const docs = docsQuery.data || [];

  const grouped = {
    failed: docs.filter((d) => d.status === "failed"),
    pending: docs.filter((d) => d.status === "pending"),
    indexed: docs.filter((d) => d.status === "indexed"),
  };

  async function handleRetry(id: string) {
    try {
      await reindexMutation.mutateAsync(id);
      notifySuccess('toasts.admin.reindexTriggered');
    } catch (err: any) {
      toast.error(err.message || "Reindex failed");
    }
  }

  function statusVariant(status: string) {
    if (status === "indexed") return "active" as const;
    if (status === "failed") return "error" as const;
    return "warning" as const;
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="knowledge" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="⚙️"
          title="Indexing Status"
          description="Monitor the indexing pipeline. Retry failed documents or wait for pending ones to complete."
        />

        {docsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading documents...</p>
        )}

        {!docsQuery.isLoading && docs.length === 0 && (
          <AdminEmptyState title="No documents" description="Add documents to the knowledge base to see indexing status." />
        )}

        {STATUS_ORDER.map((status) => {
          const items = grouped[status];
          if (items.length === 0) return null;
          return (
            <Card key={status}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base capitalize">{status}</CardTitle>
                  <AdminStatusBadge variant={statusVariant(status)}>{items.length}</AdminStatusBadge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Updated</TableHead>
                      {status === "failed" && <TableHead className="w-24"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium text-sm">{doc.title}</TableCell>
                        <TableCell>
                          <AdminStatusBadge variant={doc.is_baseline ? "info" : "active"}>
                            {doc.is_baseline ? "baseline" : "tenant"}
                          </AdminStatusBadge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(doc.updated_at).toLocaleString("de-DE", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        {status === "failed" && (
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleRetry(doc.id)}
                              disabled={reindexMutation.isPending} className="h-7 text-xs">
                              Retry
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
