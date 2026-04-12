import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Subscriptions() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="notifications" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🔔"
          title="Subscriptions"
          description="Manage user notification preferences and opt-outs"
        />
        <AdminEmptyState
          title="Subscription Management"
          description="Subscription management coming soon — manage user notification preferences and opt-outs."
        />
      </div>
    </AppLayout>
  );
}
