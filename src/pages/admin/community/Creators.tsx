import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Creators() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎨"
          title="Creators"
          description="Onboard and manage community content creators"
        />
        <AdminEmptyState
          title="Creator Management"
          description="Creator management coming soon — onboard creators, manage payouts, review content."
        />
      </div>
    </AppLayout>
  );
}
