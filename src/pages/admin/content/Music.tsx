import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Music() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎵"
          title="Music"
          description="Manage the community music library"
        />
        <AdminEmptyState
          title="Music Library"
          description="Music library management coming soon."
        />
      </div>
    </AppLayout>
  );
}
