import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export default function AssistantUsage() {
  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🤖"
          title="Assistant Usage"
          description="Track AI assistant interactions and knowledge base performance"
        />
        <AdminEmptyState
          title="Assistant Usage Analytics"
          description="Assistant usage analytics coming soon — ORB sessions, text chats, KB hit rate, top queries."
        />
      </div>
    </AppLayout>
  );
}
