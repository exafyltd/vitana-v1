import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const messagesSubItems = [
  { id: "inbox", name: "Inbox", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

export default function Messages() {
  return (
    <AppLayout>
      <SEO title="Messages" description="Manage your conversations, notifications, and communications" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Messages</h1>
          <p className="text-muted-foreground">Stay connected with your community through direct messages, group chats, and notifications. Navigate using the tabs above to access different messaging features.</p>
        </div>
      </div>
    </AppLayout>
  );
}