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
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
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
          title={t('screens.admin.podcasts')}
          description={`${items.length} podcast${items.length !== 1 ? "s" : ""} in library`}
        />
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search podcasts..."
          onReset={() => setSearch("")}
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingPodcasts')}</p>
        ) : filtered.length === 0 ? (
          <AdminEmptyState title={t('screens.admin.noPodcastsFound')} description="No podcast content matches the current filter." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.title')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.submitted')}</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">{t('screens.admin.actions')}</TableHead>
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
                      {fmtDate(new Date(p.created_at))}
                    </TableCell>
                    <TableCell>
                      {p.external_url ? (
                        <a href={p.external_url as string} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
                          {t('screens.admin.link')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "approve")}>{t('screens.admin.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "reject")}>{t('screens.admin.reject')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(p.id, "flag")}>{t('screens.admin.flag')}</Button>
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
