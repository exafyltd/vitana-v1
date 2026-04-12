import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Podcasts() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎧"
          title="Podcasts"
          description="Manage podcast episodes and series"
        />
        <AdminEmptyState
          title="Podcast Management"
          description="Podcast management coming soon."
        />
      </div>
    </AppLayout>
  );
}
