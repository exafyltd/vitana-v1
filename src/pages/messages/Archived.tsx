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

export default function Archived() {
  return (
    <AppLayout>
      <SEO title="Archived | Messages" description="View archived conversations and messages" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Archived Messages</h1>
          <p className="text-muted-foreground">Access your archived conversations and previously stored messages.</p>
        </div>
      </div>
    </AppLayout>
  );
}