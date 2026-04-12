import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Templates() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📋"
          title="Templates"
          description="Create and manage reusable notification templates"
        />
        <AdminEmptyState
          title="Notification Templates"
          description="Notification templates coming soon — create reusable templates for campaigns."
        />
      </div>
    </AppLayout>
  );
}
