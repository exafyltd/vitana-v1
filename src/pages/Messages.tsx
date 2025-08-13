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
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dear Jovana, stay connected with your community! 💬</h1>
            <p className="text-muted-foreground">Keep the conversation going with your wellness community through messages, group chats, and important notifications. Navigate using the tabs above to access different messaging features.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}