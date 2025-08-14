import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

export default function Notifications() {
  return (
    <AppLayout>
      <SEO title="Notifications | Messages" description="Manage your notifications and alerts" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
          <p className="text-muted-foreground">Manage your notifications, alerts, and communication preferences.</p>
        </div>
      </div>
    </AppLayout>
  );
}