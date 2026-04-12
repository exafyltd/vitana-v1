import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function ContentAnalytics() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📈"
          title="Content Analytics"
          description="Track views, engagement, and top-performing content"
        />
        <AdminEmptyState
          title="Content Analytics"
          description="Content analytics coming soon — track views, engagement, and top-performing content."
        />
      </div>
    </AppLayout>
  );
}
