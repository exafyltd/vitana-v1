import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Providers() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📡"
          title="Providers"
          description="Monitor push notification provider health and delivery rates"
        />
        <AdminEmptyState
          title="Provider Status"
          description="Push notification provider status coming soon — FCM delivery rates, Appilix status."
        />
      </div>
    </AppLayout>
  );
}
