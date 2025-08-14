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

export default function Group() {
  return (
    <AppLayout>
      <SEO title="Group Chats | Messages" description="Group conversations and discussions" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Group Chats</h1>
          <p className="text-muted-foreground">Participate in group conversations and community discussions.</p>
        </div>
      </div>
    </AppLayout>
  );
}