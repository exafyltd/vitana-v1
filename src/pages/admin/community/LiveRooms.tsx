import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function LiveRooms() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="community" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🎙️"
          title="Live Rooms"
          description="Monitor and manage live audio and video rooms"
        />
        <AdminEmptyState
          title="Live Room Management"
          description="Live room management coming soon — monitor active rooms, manage hosts, review recordings."
        />
      </div>
    </AppLayout>
  );
}
