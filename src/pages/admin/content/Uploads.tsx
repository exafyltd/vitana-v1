import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Uploads() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📤"
          title="Uploads"
          description="Track upload status and manage storage quotas"
        />
        <AdminEmptyState
          title="Upload Management"
          description="Upload management coming soon — track upload status, manage storage quotas."
        />
      </div>
    </AppLayout>
  );
}
