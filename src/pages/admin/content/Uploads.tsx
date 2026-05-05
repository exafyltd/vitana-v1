import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useContentItems, useContentStats, useModerateContent } from "@/hooks/useAdminContent";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';

const statusVariant = (s: string) =>
  s === "approved" ? "active" : s === "rejected" ? "error" : "warning";

export default function Uploads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: items = [], isLoading } = useContentItems();
  const { data: stats } = useContentStats();
  const moderate = useModerateContent();

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.media_type !== typeFilter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAction = (id: string, action: "approve" | "reject" | "flag") => {
    moderate.mutate({ id, action }, {
      onSuccess: () => toast.success(`Content ${action}d`),
      onError: () => toast.error(`Failed to ${action} content`),
    });
  };

  const statCards = [
    { label: "Total", value: stats?.total ?? 0, variant: "info" as const },
    { label: "Pending", value: stats?.by_status?.pending ?? 0, variant: "warning" as const },
    { label: "Approved", value: stats?.by_status?.approved ?? 0, variant: "active" as const },
    { label: "Rejected", value: stats?.by_status?.rejected ?? 0, variant: "error" as const },
  ];

  const typeOptions = Array.from(new Set(items.map((i) => i.media_type))).map((t) => ({
    value: t, label: t.charAt(0).toUpperCase() + t.slice(1),
  }));

  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader emoji="📤" title={t('screens.admin.uploads')} description="Review and moderate all content submissions" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search uploads..."
          filters={[
            {
              value: statusFilter, onChange: setStatusFilter, placeholder: "Status",
              options: [
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "flagged", label: "Flagged" },
              ],
            },
            {
              value: typeFilter, onChange: setTypeFilter, placeholder: "Type",
              options: [{ value: "all", label: "All types" }, ...typeOptions],
            },
          ]}
          onReset={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); }}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingUploads')}</p>
        ) : filtered.length === 0 ? (
          <AdminEmptyState title={t('screens.admin.noUploadsFound')} description="No content matches the current filters." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.title')}</TableHead>
                  <TableHead>{t('screens.admin.type')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.submitted')}</TableHead>
                  <TableHead className="text-right">{t('screens.admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{item.title}</TableCell>
                    <TableCell className="capitalize text-sm">{item.media_type}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={statusVariant(item.status)}>
                        {item.status}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleAction(item.id, "approve")}>{t('screens.admin.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(item.id, "reject")}>{t('screens.admin.reject')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(item.id, "flag")}>{t('screens.admin.flag')}</Button>
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
