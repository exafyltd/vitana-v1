import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSentNotifications } from "@/hooks/useAdminNotifications";
import { adminNotificationsNavigation } from "@/config/navigation";

export default function SentNew() {
  const { data, isLoading } = useSentNotifications({ days: 30 });
  const notifications = data?.notifications || data?.data || [];

  return (
    <AppLayout>
      <SubNavigation items={adminNotificationsNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📨"
          title="Sent Notifications"
          description="View all sent notifications and their delivery status"
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading sent notifications...</p>
        ) : notifications.length === 0 ? (
          <AdminEmptyState
            title="No Sent Notifications"
            description="No notifications have been sent in the last 30 days."
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.title || "Untitled"}</TableCell>
                    <TableCell className="capitalize">{n.type || "—"}</TableCell>
                    <TableCell className="capitalize">{n.channel || "push"}</TableCell>
                    <TableCell>
                      <AdminStatusBadge
                        variant={
                          n.status === "delivered" ? "active" :
                          n.status === "sent" ? "info" :
                          n.status === "failed" ? "error" :
                          "warning"
                        }
                      >
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
        )}
      </div>
    </AppLayout>
  );
}
