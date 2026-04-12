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

export default function Podcasts() {
  const { data: items = [], isLoading } = useContentItems({ type: "podcast" });
  const moderate = useModerateContent();
  const [search, setSearch] = useState("");

  const filtered = items.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (id: string, action: "approve" | "reject" | "flag") => {
    moderate.mutate({ id, action }, {
      onSuccess: () => toast.success(`Podcast ${action}d`),
      onError: () => toast.error(`Failed to ${action} podcast`),
    });
  };

  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎧"
          title="Podcasts"
          description={`${items.length} podcast${items.length !== 1 ? "s" : ""} in library`}
        />
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search podcasts..."
          onReset={() => setSearch("")}
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading podcasts...</p>
        ) : filtered.length === 0 ? (
          <AdminEmptyState title="No podcasts found" description="No podcast content matches the current filter." />
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
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={statusVariant(p.status)}>
                        {p.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {p.external_url ? (
                        <a href={p.external_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                          Link
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "reject")}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "flag")}>Flag</Button>
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
