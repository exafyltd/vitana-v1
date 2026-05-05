import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSentNotifications } from "@/hooks/useAdminNotifications";
import { adminNotificationsNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function ComposeNew() {
  const { data, isLoading } = useSentNotifications({ days: 7, pageSize: 10 });
  const notifications = data?.notifications || data?.data || [];

  return (
    <AppLayout>
      <SubNavigation items={adminNotificationsNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="✏️"
          title={t('screens.admin.compose')}
          description="Send push and in-app notifications to your users"
          rightAction={
            <Button size="sm" disabled>
              Compose New
            </Button>
          }
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingRecentNotifications')}</p>
        ) : notifications.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title || "Untitled"}</TableCell>
                    <TableCell className="capitalize">{n.type || "push"}</TableCell>
                    <TableCell>
                      <AdminStatusBadge variant={n.status === "sent" ? "active" : "warning"}>
                        {n.status || "sent"}
                      </AdminStatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : n.created_at ? new Date(n.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <AdminEmptyState
            title={t('screens.admin.fullNotificationComposer')}
            description="Full notification composer coming soon. No recent notifications found."
          />
        )}
      </div>
    </AppLayout>
  );
}
