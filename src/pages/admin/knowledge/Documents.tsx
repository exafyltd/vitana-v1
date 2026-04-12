/** Knowledge > Documents tab — main KB page */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  useKBDocuments, useCreateKBDocument, useDeleteKBDocument,
  useReindexKBDocument, useKBBaselineOptout,
} from "@/hooks/useAdminKnowledge";

export default function KnowledgeDocuments() {
  const docsQuery = useKBDocuments();
  const createMutation = useCreateKBDocument();
  const deleteMutation = useDeleteKBDocument();
  const reindexMutation = useReindexKBDocument();
  const optoutMutation = useKBBaselineOptout();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topics, setTopics] = useState("");

  const docs = docsQuery.data || [];

  async function createDoc() {
    if (!title.trim()) return;
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        body: body.trim() || undefined,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Document created");
      setTitle(""); setBody(""); setTopics(""); setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Document deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  async function handleReindex(id: string) {
    try {
      await reindexMutation.mutateAsync(id);
      toast.success("Reindex triggered");
    } catch (err: any) {
      toast.error(err.message || "Failed to reindex");
    }
  }

  async function handleOptout(documentId: string, optOut: boolean) {
    try {
      await optoutMutation.mutateAsync({ documentId, optOut });
      toast.success(optOut ? "Baseline doc opted out" : "Baseline doc opted back in");
    } catch (err: any) {
      toast.error(err.message || "Failed to update opt-out");
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
          emoji="📚"
          title="Knowledge Base Documents"
          description="Manage your tenant knowledge base. Upload documents, control baseline content, and monitor indexing."
          rightAction={
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Upload Document"}
            </Button>
          }
        />

        {showForm && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Document body..." rows={4} />
              <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Topics (comma-separated)" />
              <Button size="sm" onClick={createDoc} disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Document"}
              </Button>
            </CardContent>
          </Card>
        )}

        {docsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading documents...</p>
        )}

        {!docsQuery.isLoading && docs.length === 0 && (
          <AdminEmptyState
            title="No documents yet"
            description="Upload your first knowledge base document to get started."
            actionLabel="Upload Document"
            onAction={() => setShowForm(true)}
          />
        )}

        {docs.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Topics</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id} className={doc.is_opted_out ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-sm max-w-48 truncate">{doc.title}</TableCell>
                      <TableCell>
                        <AdminStatusBadge variant={doc.is_baseline ? "info" : "active"}>
                          {doc.is_baseline ? "baseline" : "tenant"}
                        </AdminStatusBadge>
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge variant={statusVariant(doc.status)}>{doc.status}</AdminStatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.topics?.slice(0, 3).map((t) => (
                            <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                          {(doc.topics?.length || 0) > 3 && (
                            <span className="text-xs text-muted-foreground">+{doc.topics.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {doc.is_baseline ? (
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <Checkbox
                                checked={doc.is_opted_out}
                                onCheckedChange={(v) => handleOptout(doc.id, !!v)}
                                disabled={optoutMutation.isPending}
                              />
                              Opt out
                            </label>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleReindex(doc.id)}
                                disabled={reindexMutation.isPending} className="h-7 text-xs">
                                Reindex
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}
                                disabled={deleteMutation.isPending} className="h-7 text-xs text-destructive">
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
