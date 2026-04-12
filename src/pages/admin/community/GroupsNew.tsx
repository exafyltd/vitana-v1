import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function GroupsNew() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="👥"
          title="Groups"
          description="Create, archive, and moderate community groups"
        />
        <AdminEmptyState
          title="Group Management"
          description="Group management coming soon — create, archive, and moderate community groups."
        />
      </div>
    </AppLayout>
  );
}
