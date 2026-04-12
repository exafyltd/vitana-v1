import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useContentItems, useModerateContent } from "@/hooks/useAdminContent";
import { toast } from "sonner";

const statusVariant = (s: string) =>
  s === "approved" ? "active" : s === "rejected" ? "error" : "warning";

export default function Music() {
  const { data: items = [], isLoading } = useContentItems({ type: "music" });
  const moderate = useModerateContent();
  const [search, setSearch] = useState("");

  const filtered = items.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (id: string, action: "approve" | "reject" | "flag") => {
    moderate.mutate({ id, action }, {
      onSuccess: () => toast.success(`Track ${action}d`),
      onError: () => toast.error(`Failed to ${action} track`),
    });
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎵"
          title="Music"
          description={`${items.length} track${items.length !== 1 ? "s" : ""} in library`}
        />
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search music..."
          onReset={() => setSearch("")}
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading music...</p>
        ) : filtered.length === 0 ? (
          <AdminEmptyState title="No music found" description="No music content matches the current filter." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{m.title}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={statusVariant(m.moderation_status)}>
                        {m.moderation_status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {m.external_url ? (
                        <a href={m.external_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                          Link
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleAction(m.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(m.id, "reject")}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(m.id, "flag")}>Flag</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
