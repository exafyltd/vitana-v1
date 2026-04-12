import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Reports() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📑"
          title="Reports"
          description="Build and schedule custom tenant-specific reports"
        />
        <AdminEmptyState
          title="Custom Reports"
          description="Custom reports coming soon — build and schedule tenant-specific reports."
        />
      </div>
    </AppLayout>
  );
}
