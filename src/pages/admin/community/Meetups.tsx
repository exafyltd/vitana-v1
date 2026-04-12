import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function Meetups() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🤝"
          title="Meetups"
          description="Moderate and manage community meetups"
        />
        <AdminEmptyState
          title="Meetup Moderation"
          description="Meetup moderation coming soon — approve, feature, or remove community meetups."
        />
      </div>
    </AppLayout>
  );
}
