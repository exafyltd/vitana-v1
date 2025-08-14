import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users, Bell, Archive } from "lucide-react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

export default function Messages() {
  const navigate = useNavigate();

  const categoryCards = [
    {
      id: "direct",
      title: "Direct Messages",
      description: "One-on-one conversations with your wellness community",
      icon: MessageCircle,
      path: "/messages/direct",
      color: "from-blue-100 to-cyan-100"
    },
    {
      id: "group",
      title: "Group Chats",
      description: "Connect with multiple people in group conversations",
      icon: Users,
      path: "/messages/group",
      color: "from-green-100 to-emerald-100"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Stay updated with important wellness alerts",
      icon: Bell,
      path: "/messages/notifications",
      color: "from-orange-100 to-amber-100"
    },
    {
      id: "archived",
      title: "Archived",
      description: "Access your archived conversations and messages",
      icon: Archive,
      path: "/messages/archived",
      color: "from-purple-100 to-violet-100"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Messages" description="Manage your conversations, notifications, and communications" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Stay connected with your community! 💬</h1>
            <p className="text-muted-foreground">Keep the conversation going with your wellness community through messages, group chats, and important notifications.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCards.map((card) => (
              <Card 
                key={card.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm border border-white/20"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-muted-foreground text-sm">{card.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}