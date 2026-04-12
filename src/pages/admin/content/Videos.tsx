import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Videos() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎬"
          title="Videos"
          description="Upload, transcode, and curate video content"
        />
        <AdminEmptyState
          title="Video Management"
          description="Video management coming soon — upload, transcode, and curate video content."
        />
      </div>
    </AppLayout>
  );
}
